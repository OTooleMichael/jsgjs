(function(){
	function JSG(data){
		this.data = data;
		this.where = this.filter;
		this.having = this.filter;
		this.orderBy = this.sort;
		return this
	}
	JSG.prototype = {
		constructor:JSG,
		setData:function(data){
			this.data = data;
			return this
		},
		join:function(rightSide){
			return new Join(this,rightSide)
		},
		leftJoin:function(rightSide,on){
			return new Join(this,rightSide).allJoins(on,true,false,false)
		},
		rightJoin:function(leftSide,on){
			return new Join(leftSide,this).allJoins(on,true,false,false)
		},
		innerJoin:function(rightSide,on){
			return new Join(this,rightSide).allJoins(on,false,true,false)
		},
		outterJoin:function(rightSide,on){
			return new Join(this,rightSide).allJoins(on,false,false,true)
		},
		select:function(selectionArray){
			return new Select(this,selectionArray)
		},
		group:function(groupBy,fields){
			return new Group(this,groupBy,fields)
		},
		sort:function(field,direction){
			if(direction===undefined&&field.includes("::")){
				direction = field.split("::")[1];
				field = field.split("::")[0];
			}
			if(typeof direction == "string"){
				direction = (direction.toLowerCase() == "desc") ? -1:1;
			}
			this.data = this.data.sort(dynamicSort(field,direction))
			return this
			function dynamicSort(field,direction) {
	            return function (a,b) {
	                var result = ( a[field] < b[field] ) ? -1 : (a[field]  > b[field] ) ? 1 : 0;
	                return result * direction;
	            }
	        }
		},
		filter:function(filterFunction){
			return new Filter(this,filterFunction)
		},
		limit:function(num){
			var out =[];
			var i;
			for(i=0;i<num;i++){
				out.push(this.data[i])
			}
			this.data = out;
			return this
		},
		result:function(){
			return this.data
		}
	};
	if(typeof module ==="undefined"){
		JSG.prototype.export = function(functionName,alias){
			if(!exportables[functionName]) throw "cant Export "+functionName
			alias = alias || functionName;
			window[alias] = exportables[functionName];
		}
	}
	function Filter(data,filterFunction){
		if(data instanceof JSG){
			this.parent = data
			data = this.parent.data;
		}
		var output = [];
		data.forEach(function(ob){
			if(filterFunction(ob)) output.push(ob)
		});
		if(this.parent) return this.parent.setData(output)
		return new JSG(output)
	}
	function Join(leftSide,rightSide){
		if(leftSide instanceof JSG){
			this.parent = leftSide
			leftSide = this.parent.data;
		}
		if(rightSide instanceof JSG){
			this.parent = rightSide
			rightSide = this.parent.data;
		}
		if(!isArrayOfJSON(leftSide) || !isArrayOfJSON(rightSide)) return
		this.headers = {};
		for(var leftH in leftSide[0]){
			this.headers[leftH] = "left";
		};
		for(var rightH in rightSide[0]){
			if(this.headers[rightH] == undefined){
				this.headers[rightH] = "right";
			}else{
				this.headers[rightH] = "both";
			}
		};
		this.joinableHeaders = [];
		for(var head in this.headers){
			if(this.headers[head] == "both"){ this.joinableHeaders.push(head) };
		}
		this.left = leftSide;
		this.right = rightSide;
		return this
	};
	Join.prototype ={
		constructor:Join,
		getDefaultRow:function(){
			return new JoinRow(this);
		},
		results:function(){
			return this.rows
		},
		leftJoin:function(on){
			return this.allJoins(on,true,false,false)
		},
		innerJoin:function(on){
			return this.allJoins(on,false,true,false)
		},
		outterJoin:function(on){
			return this.allJoins(on,false,false,true)
		},
		allJoins:function(on,leftJoin,innerJoin,outterJoin){
			this.on = on;
			if(this.headers[on] == undefined) throw on+" is not a valid header (as per row[0]";
			if(this.headers[on] != "both")throw on+" is only found in the "+this.headers[on]+" table";
			this.joiningObject = {};
			return this.fillLeft().fillRight(outterJoin).flattenJoin(innerJoin).finish()
		},
		fillLeft:function(){
			var lenL = this.left.length;
			var join;
			for(var i = 0; i< lenL; i++){
				if( this.left[i][this.on] instanceof Object ||this.left[i][this.on] instanceof Array)throw "Row"+i+" :objects are not premitted in the joining field "+this.left[i][this.on]
			 	join  = (this.left[i][this.on]!== null && this.left[i][this.on] !== undefined) ?  this.left[i][this.on] : "blank_field_left" ;
				if(this.joiningObject[ join ] == undefined){
					this.joiningObject[ join ] = [];
				};
				var row = this.getDefaultRow().fillRowLeft(this.left[i]);
				this.joiningObject[ join ].push(row);
			};
			this.left = null;
			return this
		},
		fillRight:function(outterJoin){
			var on = this.on;
			var lenR = this.right.length;
			var join;
			for(var j= 0; j<lenR; j++){
				if( this.right[j][this.on] instanceof Object ||this.right[j][this.on] instanceof Array)throw "Row"+j+" :objects are not premitted in the joining field: "+JSON.stringify(this.right[j][this.on]);
			 	join  = (this.right[j][this.on]!== null && this.right[j][this.on] !== undefined) ? this.right[j][this.on] : "blank_field_right";
				
				if(outterJoin){
					if(this.joiningObject[ join ] == undefined){
						this.joiningObject[ join ] = []
					}
					var row = this.getDefaultRow().fillRowRight(this.right[j]);
					this.joiningObject[ join ].push(row);	
				}else{
					if(this.joiningObject[ join ] != undefined){
						var currentLength = this.joiningObject[ join ].length;
						for(var k = 0; k< currentLength ;k++){
							this.joiningObject[ join ][k].fillRowRight(this.right[j]);
						}
					}
				}
			}
			this.right = null;
			return this
		},
		flattenJoin:function(inner){
			this.rows =[];
			for(var el in this.joiningObject){
				for(var i=0;i<this.joiningObject[el].length;i++){
					if(!inner || this.joiningObject[el][i].isJoined()=="both"){
						var rows = this.joiningObject[el][i].getRows();
						this.rows = this.rows.concat(rows);
					}
				}
			}
			this.joiningObject=undefined;// remove From memory as it serves no further use
			return this
		},
		finish:function(){
			if(this.parent) return this.parent.setData(this.rows)
			return new JSG(this.row)
		}
	}
	function JoinRow(JoinObject){
		this.JoinObject = JoinObject;
		var on  = JoinObject.on;
		this.joined = false;
		this.row = this.makeRow();
		this.rightSides = [];
		this.row[on]= null;
		return this
	}
	JoinRow.prototype = {
		constructor:JoinRow,
		makeRow:function(){
			var headers = this.JoinObject.headers,
			on=this.JoinObject.on,
			joinableHeaders=this.JoinObject.joinableHeaders;
			var row = {};
			if(joinableHeaders.length>1){
				for(var h in headers){
					if(h!=on){
						if(headers[h]=='both'){
							var l = h+"-left",
								r = h+"-right";
							row[l]=null;
							row[r]=null;
						}else{
							row[h]=null
						}
					}
				}
			}else{
				for(var h in headers){
					if(h!=on){
						row[h]=null;
					}
				}
			}
			return row
		},
		isJoined:function(){
			return this.joined
		},
		getRow:function(){
			return this.row
		},
		getRows:function(){
			if(this.rightSides.length==0){
				return [this.row]
			}else{
				return this.rightSides
			}
		},
		duplicateRow:function(){
			return new JoinRow(this.JoinObject).fillRowLeft(this.row)
		},
		fillRowLeft:function(rowData){
			return this.fillRow(rowData,"left");
		},
		fillRowRight:function(rowData){
			return this.fillRow(rowData,"right");
		},
		fillRow:function(rowData,side){
			var count = 0;
			for(var el  in rowData){
				if(this.row[el] === undefined){
					var s = el+"-"+side;
					if(this.row[s] === undefined){
						throw "rows not standard "+JSON.stringify(rowData)+" element "+el+" was unexpected: ensure that row[0] is a descriptive row matching the standard dataset"
					}
					this.row[s] = rowData[el];
					count ++;
				}else{
					this.row[el] = rowData[el];
					count ++;
				}
			}
			if(side == "right"){
				var temp = {};
				for(var el in this.row){
					temp[el] = this.row[el];
				}
				this.rightSides.push(temp);
			}
			if(count>0){
				if(this.joined){
					this.joined = "both";
				}else{
					this.joined = side;
				}
			}
			return this
		}
	}
	//////////////////////////////////
	function Group(data,groupBy,fields){
		if(data instanceof JSG){
			this.parent = data
			data = this.parent.data;
		}
		if(!isArrayOfJSON(data)) return
		fields = parseGroupInput(fields);
		this.data = data;
		this.headers = [];
		for(var el in data[0]){
			this.headers[el] = typeof data[0][el]
		}
		groupBy = (typeof groupBy == "string") ? [groupBy] : groupBy;
		if(!this.checkHeaderArray(groupBy) && groupBy[0] !="All"){
			throw JSON.stringify(groupBy)+" is not a valid header"
		}
		if(!this.checkHeaderArray(fields)){
			throw JSON.stringify(fields)+" is not a valid header"
		}
		this.groupBy = groupBy;
		this.fields  = fields;
		return this.operate()
	}
	function parseGroupInput(fields){
		if(!(fields instanceof Array)) fields = [fields];
		var holder ={};
		for(var i = 0; i< fields.length;i++){
			var oneField;
			if(typeof fields[i] == "string"){
				var temp = fields[i].split("::");
				oneField = {
					header:temp[0],
					operations:[temp[1]||"sum"]
				};
			}else if(!fields[i].header || !fields[i].operations){
				throw "Fields must be given as an array eg. [{header:x, operations:['sum','avg']} or ['x::sum','x::avg']"
			}else{
				oneField = fields[i];
			}
			if(holder[oneField.header] == undefined){
				holder[oneField.header] = {header:oneField.header,operations:[]}
			}
			oneField.operations.forEach(function(op){
				holder[oneField.header].operations.push(op)
			});
		}
		var output = [];
		for(var f in holder){
			output.push(holder[f])
		}
		return output
	}
	Group.prototype = {
		constructor:Group,
		operate:function(){
			this.temp = {};
			var len = this.data.length
			for(var i = 0;i<len;i++){
				var groupEl = (this.groupBy[0]== "All") ? "All" : this.makeGroupEl(i);
				if(this.temp[groupEl] == undefined){
					this.temp[groupEl] = new GroupRow(this, this.data[i]);
				}
				this.temp[groupEl].operate(this.data[i]);
			}
			this.rows = [];
			for(var r in this.temp){
				var row = this.temp[r].flatten().row;
				this.rows.push(row);
			}
			this.data = undefined;// memory clean up
			this.temp = undefined;
			return this.finish()
		},
		finish:function(){
			if(this.parent) return this.parent.setData(this.rows)
			return new JSG(this.row)
		},
		makeGroupEl:function(i){
			var row = this.data[i];
			var out = "";
			for(var i = 0;i< this.groupBy.length;i++){
				out+=row[this.groupBy[i]];
			}
			return out
		},
		headerType:function(header){
			return this.headers[header]
		},
		checkHeaderArray:function(array){
			for(var i=0;i<array.length;i++){
				var header = array[i].header || array[i];
				if(!this.headerType(header)){
					return false
				}
			}
			return true
		}
	}
	function GroupRow(groupByObj,row){
		this.row = {};
		this.tempRow ={};
		this.fields = groupByObj.fields;
		this.groupBy = groupByObj.groupBy;
		for(var j =0; j<this.groupBy.length;j++){
			this.row[this.groupBy[j]] = row[this.groupBy[j]];
			this.tempRow[this.groupBy[j]] = row[this.groupBy[j]];
		}
		for(var k = 0 ;k < this.fields.length; k ++){
			var title = this.fields[k].header;
			this.tempRow[title] = {};
			if(!(this.fields[k].operations instanceof Array)) this.fields[k].operations = [this.fields[k].operations];
			for(var l = 0 ; l < this.fields[k].operations.length; l ++ ){
				var oper = this.fields[k].operations[l];
				if(oper != "unique" && oper != "median" && oper != "avg" && oper != "mode" && oper != "parse"){
					this.tempRow[title][oper] = 0;
				}else if(oper == "avg"){
					this.tempRow[title].count = 0;
					this.tempRow[title].sum = 0;
				}else if(oper == "unique" || oper == "mode"){
					this.tempRow[title][oper] = {};
				}else if(oper == "median"){
					this.tempRow[title][oper] = [];
				}
				if(oper == "max" || oper == "min"){
					this.tempRow[title][oper] = (typeof row[title] == "number" ) ? row[title] : null
				}
			}
		}
		return this
	}

	GroupRow.prototype = {
		constructor:GroupRow,
		operate:function(data){
			for(var i = 0 ; i < this.fields.length;i++){
				var field = this.fields[i].header;
				var newNum =  data[field];
				if(this.fields[i].operations.join().includes("parse")) newNum = parseFloat(newNum);
				if(newNum != undefined){// null || undefined cause a skip 
					var temp = this.tempRow[field];
					if(temp.count !==undefined){
						this.tempRow[field].count ++;
					}
					if(temp.unique !== undefined && !temp.unique[newNum]){
						this.tempRow[field].unique[newNum] = true;
					}
					if(temp.mode !==undefined){
						if(temp.mode[newNum]){
							this.tempRow[field].mode[newNum]++ ;
						}else{
							this.tempRow[field].mode[newNum] = 1;
						}
					}
					if(typeof newNum != "number"){
						console.log(newNum+" value of this row was not a number")
						console.log(data);
						return this
					}
					if(temp.sum !==undefined){
						this.tempRow[field].sum += newNum;
					}
					if(temp.max !==undefined && temp.max < newNum){
						this.tempRow[field].max = newNum;
					}
					if(temp.min !==undefined && temp.min > newNum){
						this.tempRow[field].min = newNum;
					}
					if(temp.median !==undefined){
						this.tempRow[field].median.push(newNum);
					}
				}
			}
			return this
		},
		flatten:function(){
			for(var i = 0 ; i < this.fields.length; i++ ){
				var field = this.fields[i].header;
				for(var j= 0;j<this.fields[i].operations.length;j++){
					var op = this.fields[i].operations[j];
					this.simpleCombine(op,field);
				}	
			}
			return this
		},
		simpleCombine:function(operator,field){
			if(operator == "unique" || operator == "median" || operator == "avg" || operator == "mode" ){
				return this[operator](field);
			}
			this.row[field+"_"+operator] = this.tempRow[field][operator];
			return this
		},
		avg:function(field){
			this.row[field+"_avg"] = this.tempRow[field].sum/this.tempRow[field].count;
			return this
		},
		unique:function(field){
			var count = 0;
			for(var u in this.tempRow[field].unique){
				count++
			};
			this.row[field+"_unique"] = count;
			return this
		},
		median:function(field){
			var sorted = this.tempRow[field].median.sort(function(a,b){return a-b});
			var mid = (Math.floor(sorted.length/2));
			this.row[field+"_median"] = sorted[mid];
			return this
		},
		mode:function(field){
			var max =  undefined;
			var mode;
			for(var i in this.tempRow[field].mode){
				if(max === undefined){ 
					max =  this.tempRow[field].mode[i];
					mode = i;
				}
				if(max < this.tempRow[field].mode[i]){
					max = this.tempRow[field].mode[i];
					mode = i;
				}
			};
			this.row[field+"_mode"] = mode;
			return this
		}
	}
	function Select(data,selectionArray){
		if(data instanceof JSG){
			this.parent = data;
			data = this.parent.data;
		};
		this.data = data;
		this.selectionArray = selectionArray;
		this.fields = selectionArray.map(function(o,i){
			var out = {
				title:null,
				val:null,
			};
			if(typeof o == "string"){
				out.val = o;
				out.title = o;
			}else if(!o.val){
				out.val = o.title;
				out.title = o.title;
			}else{
				out.val = o.val;
				out.title = o.title;
			}
			return out
		});
		this.rows=[];
		for(var i = 0 ; i<this.data.length;i++){
			this.rows.push(new SelectionRow(this.fields,this.data[i]).row)
		}
		return this.finish()
	}

	Select.prototype = {
		constructor:"Select",
		finish:function(){
			if(this.parent) return this.parent.setData(this.rows)
			return new JSG(this.row)
		}
	}

	function SelectionRow(fields,data){
		this.row = {};
		for(var j=0;j<fields.length;j++){
			this.row[fields[j].title] = null;
		}
		for(var i = 0; i<fields.length;i++){
			var f = fields[i];
			if(typeof f.val == "function"){
				this.addValue(f.title,f.val(data));
			}else{
				this.addValue(f.title,data[f.val]);
			}
		}
		return this
	}
	SelectionRow.prototype.addValue = function(header,value){
		if(this.row[header] === undefined) throw header+" is not a valid header";
		this.row[header] = value;
		return this
	}

	//////////////////// Valid Data Checks /////

	function isArrayOfJSON(data){
		if(!(data instanceof Array)) throw "data given was not an array "+JSON.stringify(data)
		if(!(data[0] instanceof Object)) throw "data[0] was not an object "+JSON.stringify(data[0])
		return true
	}
	if(typeof module !=="undefined"){
		module.exports = JSG
	}else{
		window.JSG = JSG
	}
	var exportables = {
		Group:Group,
		Select:Select,
		Join:Join
	}
})();


