h-entity-controller is an interface between hapijs h-backend and h-database.
It provide ready controllers functions to act upon request object from hapi and communicate with the h-database by generating suitable seneca commands.
The controllers functions acts as handlers to the route config

The provided controller functions are:
- queryRecordsController
- getRecordController
- deleteRecordController
- insertRecordController
- updateRecordController

The controllers functions reads configs from hapi route config.plugins as in below  example.

```
plugins: {
  model: 'model_name',
  args: {},
  action function(request, reply, args){},
```


queryRecords Example:

```
var entityController = require(appRoot + '/lib/entitySenecaController');

module.exports =
    [
        {
            method: 'GET',
            path: '/api/models/posts',
            config: {
                plugins: {
                    model: 'post',
                    args: {
                        limit: '20',
                        columns: ['id', 'title'],
                        relations: ['posts','badges.role'],
                        where: [
                        	{col: 'group_id', op:'IN', val: '(1,2)'},
                        	{col: 'created_at', op:'<', val: '2017-05-01'}
                        ]
                    },
                    action: function(request, reply, args){
		                    //this action is called before sending the seneca commands
                        if(keyword = request.query['keyword']){
                            args.where.push({ col:'display_name', op:'LIKE', val: '%' + keyword + '%', group:'g1', groupOp:'or' });
                        }
                    },
                },
                handler: entityController.queryRecords
            }
        }
    ]

```

