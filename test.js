  var JSG = require('./index');
 var rows = [
  {name:"kate",age:30},
  {name:"john",age:20},
  {name:"kate",age:1},
  {name:"mary",age:16},
];
var sorted = new JSG(rows).sort("age::asc").result()
  // note that items is ommited and therefore will be omitted from the results set

  console.log(sorted);