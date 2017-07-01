/*
  var url = 'http://192.168.33.10:3010/api/posts?filter[category_id][g1][>][or]=1&filter[category_id][g1]=2&filter[status_id]=2&filter[status_id]=2&filter[status_id]=1&filter[queue_id]=1&page=1&pageSize=25';

  filter[category_id][g1][>][or]=1  ------->  { col: 'category_id',   group: 'g1',      op: '=',    groupOp: 'or',    val: '1' },
  filter[category_id][g1][=][or]=2  ------->  { col: 'category_id',   group: 'g1',      op: '=',    groupOp: 'or',    val: '2' },
  filter[category_id][g1][=][or]=3  ------->  { col: 'category_id',   group: 'g1',      op: '=',    groupOp: 'or',    val: '3' },
  filter[status_id]=2               ------->  { col: 'status_id',     group: 'g2',      op: '=',    groupOp: 'or',    val: '2' },
  filter[queue_id]=1                ------->  { col: 'status_id',     group: 'g2',      op: '=',    groupOp: 'or',    val: '2' },
  filter[status_id]=1               ------->  { col: 'queue_id',      group: '',        op: '=',    groupOp: 'and',   val: '1' },
  filter[created_at]=1              ------->  { col: 'created_at',    group: '',        op: '>=',   groupOp: 'and',   val: '01/01/2016' },
  filter[created_at]=1              ------->  { col: 'created_at',    group: '',        op: '<=',   groupOp: 'and',   val: '01/06/2017' }

  eq  = 
  ne  <>

  le  <=
  lt  <

  ge  <=
  gt  <

  like
  isnull
  isnotnull


*/





const querystring = require('querystring');
const _ = require('lodash');
const opMap = {
  'eq'       : '=',
  'ne'       : '<>',
  'le'       : '<=',
  'lt'       : '<',
  'ge'       : '<=',
  'gt'       : '<',
  'like'     : 'LIKE',
  'isnull'   : 'IS NULL',
  'isnotnull': 'IS NOT NULL',
}





module.exports.unBraketize = function(key){
  // Regular expression to extract keys from multiple squaire brackets like this [category][g1][eq]
  var regex = /\[(.+?)\]/g
  var tokens = [];
  while( matches = regex.exec(key) ){
    tokens.push(matches[1]);
  }
  return tokens;
}







module.exports.processFilters = function(url)
{
    //get query section from url, and extract only filters keys from the query string
    var query = url.indexOf('?') >= 0 ? url.substring(url.indexOf('?')+1,url.length) : url;
    var queryComponents = querystring.parse(query)
    var filterClauses = _.pickBy(queryComponents, function(value, key) {
      return _.startsWith(key,'filter');
    });


    //Prepare where clauses, expecting format: filter[column][group][op][groupOp]
    //Any missing parameter will put do default: filter[column][''][eq][and]
    //if the first column parameter is missing, the keyvalue pair is discarded.
    var whereClauses = [];
    _.each(filterClauses, function(value, key) {
      var tokens = module.exports.unBraketize(key);
      // console.log('***************************************');
      // console.log('tokens:', tokens);
      // console.log('values:', value);
      value = _.isArray(value) ? value : [value];
      _.map(value,function(v){//this is because values with same keys are combined by querystring as an array
        if(tokens.length > 0) {
          var aClause = {
            col: tokens[0],
            group: tokens[1] || '',
            op: opMap[tokens[2] || 'eq'],
            groupOp: tokens[3] == 'or' ? 'or' : 'and',
            val:v
          };
          if(!aClause.op){
            aClause.op = opMap['eq'];
          }
          whereClauses.push(aClause);
        }        
      });
    });

    // console.log(queryComponents);
    // console.log(filterClauses);
    // console.log(whereClauses);
    // console.log(groupedWhereClauses);

    return whereClauses;
}
