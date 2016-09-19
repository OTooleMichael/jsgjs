# jsgjs
Join Select Group-js. A small utility for performing SQL like join select and group operations on Arrays of Objects in JS



JSG js
=========

Join Select Group-js. A small utility for performing SQL like join select and group operations on Arrays of Objects in JS. With high perfomance on large data sets. 

Useful for front-end data manipulation and backend datastreaming and analysis without Db storage. ie. combining analytic data from an third party api wiith in house Db. 



## Installation

  npm install jsgjs --save

### Node 
```javascript
var JSG = require("jsgjs");
```

### Browser
Also included is a frontend jsgjs.min.js file

```javascript
<script type="text/javascript" src="/servingDirectory/jsgjs.min.js"></script>
var useableObject = new JSG(initData);
```
---	
# Usage

A creted JSG object has 3 possible methods for manipulating data: 
 -Join
 -Select
 -Group

Here is an example of all three used on two data sets

```javascript
var JSG = require('jsgjs');
var users = [
	{id:1,name:"John"},
	{id:2,name:"Kate"},
	{id:3,name:"Mary"},
	{id:4,name:"Michal"},
];
var orders = [
	{user_id:2,items:1,price_cents:100},
	{user_id:2,items:5,price_cents:10000},
	{user_id:3,items:2,price_cents:500},
	{user_id:1,items:1,price_cents:1100},
];

var spendData = new JSG(users).select([
	{title:"user_id",val:"id"},
	"name"
]).leftJoin(orders,"user_id").group(
	"name",
	["price_cents::sum","items::avg"]
).select([
	"name",
	"items_avg",
	{title:"euros_spent",val:function(row){
		return row.price_cents_sum/100
	}}
]).result(); 
console.log(spendData)

// Result
[ { name: 'John', items_avg: 1, euros_spent: 11 },
 { name: 'Kate', items_avg: 3, euros_spent: 101 },
 { name: 'Mary', items_avg: 2, euros_spent: 5 },
 { name: 'Michal', items_avg: NaN, euros_spent: 0 } ] }
```

## JSG Object
The JSG object provides routes by which to preform the _join_, _group_ and _select_ methods. It stores and then removes transient data from memory. It takes one argmument which is an _array of JSON objects_. This argument acts as the left dataset for a join and the primary dataset other operations.

```javascript
var names = [
	{id:1,name:"Kate"},
	{id:2,name:"Mary"},
];
var dataObject =  new JSG(names);
console.log( dataObject.data , dataObject.result() ) // both return the names data set
```


When join , select or group methods are executed the results overwrite the previous 'data' property of the JSG object (ie. dataObject.data from above)

## Join
The Join method creates a join object on which four joins can be preformed:
+ outterJoin
+ innerJoin
+ leftJoin
+ rightJoin

These mirror SQL like join in behaviour. 
_rightJoin is simply a left join but inverts the dataSource._
 
```javascript
var colours =[
	{name:"kate",colour:"blue"},
	{name:"john",colour:"red"},
	{name:"james",colour:"grey"},
];
var foods =[
	{name:"kate",colour:"chips"},
	{name:"john",colour:"apples"},
];
var leftJoinEx = new JSG(colours).leftJoin(foods,"name").result()
var rightJoinEx = new JSG(foods).rightJoin(colours,"name").result()

//leftJoinEx and rightJoinEx both return
//[ { name: 'kate', 'colour-left': 'blue', 'colour-right': 'chips' },
//{ name: 'john', 'colour-left': 'red', 'colour-right': 'apples' },
//{ name: 'james', 'colour-left': 'grey', 'colour-right': null } ]
```
```javascript
// Join syntax is as follows 
var myJoinObject  = new JSG(dataSource1)[typeofJoin](dataSource2,"fieldToJoinOn")
```

The Join field must exist in _both dataSets_. If names are different as in the first example
(ie join user_id and id) then a select statement or indeed a native array.map() function should be used.

*N.B Currently the first row of each data set is used for header evaluation so ensure all relatvent headers are therein contained. There is an assumption of data validity*

## Select
Select provides similar functionality to the native .map method. However It provides utility in syntax and also in the context of other JSG methods

It takes one argument - *selectionArray*

Each element in the selectionArray maps one column

A selectionArray element can come in three forms
1. String
2. Object of form:  {title:string, val:string } 
3. Object of form: { title:string, val:function }

```javascript
var orders = [
  	{user_id:2,items:1,price_cents:100},
  	{user_id:2,items:5,price_cents:10000},
  	{user_id:3,items:2,price_cents:500},
  	{user_id:1,items:1,price_cents:1100},
];
var selectionArray = [
	{title:"user",val:"user_id"}, //maps the field user_id onto a new field named user
	"price_cents", // this maps the field transparently
	{title:"price_euros",val:function(row){return row.price_cents/100}} // this operates on each row
]
// note that items is ommited and therefore will be omitted from the results set

var result = new JSG(orders).select(selectionArray).result()
// result
// [ { user: 2, price_cents: 100, price_euros: 1 },
// { user: 2, price_cents: 10000, price_euros: 100 },
// { user: 3, price_cents: 500, price_euros: 5 },
// { user: 1, price_cents: 1100, price_euros: 11 } ]
```

## Group
Group allows aggregation of data rows.
Group takes two arguments:
1. GroupBy
  - The field (string) or fields (array of strings) by which to group
  - "All" is another valid input (which does what it says on the tin)
2. Field(s) to Aggregrate
  - This field provides some syntax freedoms.

#### Fields Argument
The Basic form is as per below
	
```javascript
{header:"columnName::string",operators:["agerateFunctionName::string"]}

eg: [{header:"price_cents",operators:["sum","avg","count"]}]
````

A plain array of strings with columnName and operation seperated by the deliminator  ::  may also be used
```javascript
	eg: ["price_cents::sum","price_cents::avg"]
```
_NB : this second option is parsed into the first_

#### Available Operators: 
- sum - numeric values only , disregarding null values
- avg - numeric values only , disregarding null values
- count - all values , disregarding null values
- unique - all values , disregarding null values
- median - numeric values only , disregarding null values
- mode - all values , disregarding null values
- max - numeric values only , disregarding null values
- min - numeric values only , disregarding null values
	
```javascript		
var orders = [
    {user_id:2,items:1,price_cents:100},
    {user_id:2,items:5,price_cents:10000},
    {user_id:3,items:2,price_cents:500},
    {user_id:1,items:1,price_cents:1100},
];
var syntax1 = new JSG(orders).group("All",[
    {header:"price_cents",operations:["sum","avg","median","max"]},
    {header:"items",operations:["count","min","sum"]}
]).result();

var syntax2 = new JSG(orders).group("All",[
	"price_cents", // "price_cents" is parsed as "price_cents::sum" by default
	"price_cents::avg",
	"price_cents::median",
	"price_cents::max",
	"items",
	"items::count",
	"items::min"
]).result();
```
syntax1 and syntax2 will bring the same results 

```javascript
	// the output of results
result = [ { 
	All: undefined,
    price_cents_sum: 11700,
    price_cents_avg: 2925,
    price_cents_median: 1100,
    price_cents_max: 10000,
    items_count: 4,
    items_min: 1,
    items_sum: 9 
 }];
 ```

## Filter (where/having)
Remove rows that dont meet a certain test. Syntax where , filter or having may be used. The one argument is a function that returns a boolean.

```javascript
var rows = [
	{name:"kate",age:30},
	{name:"john",age:20},
	{name:"kate",age:1},
	{name:"mary"},
];
var filtered = new JSG(rows).filter(function(row){
	return row.age > 10
}).result()

[
	{name:"kate",age:30},
	{name:"john",age:20},
];
```

## Sort (orderBy)
Sort the data according to one field/ column name by ascending (asc) or decending (desc)
sort or orderBy methods can be used. The take one or two argument.
- .sort("column","direction")
- .sort("column::direction")

```javascript
var rows = [
	{name:"kate",age:30},
	{name:"john",age:20},
	{name:"kate",age:1},
	{name:"mary",age 16},
];
var sorted = new JSG(rows).sort("age::asc").result()
var sorted = new JSG(rows).sort("age","asc").result()
var sorted = new JSG(rows).sort("age",1).result()

[ { name: 'kate', age: 1 },
  { name: 'mary', age: 16 },
  { name: 'john', age: 20 },
  { name: 'kate', age: 30 } ]
```


## Release History

* 0.1.0 Initial release