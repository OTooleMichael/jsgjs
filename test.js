  var JSG = require('./index');
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
  // note that items is ommited and therefore will be omitted from the results set

  console.log(leftJoinEx,rightJoinEx);