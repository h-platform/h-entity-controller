var assert = require('assert');
var Boom = require("boom");
var inflect = require('i')();
var Joi = require('joi');
var promise = require('bluebird');
var _ = require('lodash');

var l = require(appRoot + '/logger');
var seneca = require(appRoot + '/seneca_instance');



/*
This library depends on plugin configuration of the route, example of a typical hapijs route:

{
  method: 'GET',
  path: '/api/models/groups',
  config: {
      auth: { 
          strategy: 'session',
          mode: 'required'
      },
      handler: entityController.getRecord,
      plugins: {
          model: 'group',
          getRecord: {
              /* ------------ action as configuratino ------------
              action: {
                  'group', cmd:'queryRecords', orderBy:'group_name', relations: ['image']
              },
              /* ------------ or action as callable function --------------------------
              action: function(request, reply, action){
                return {
                  role:'database', model: 'group', cmd:'queryRecords', relations: ['image'], columns: ['id','group_name','group_info']
                };
              },
              sideActions: {
                statuses: {
                  role:'database', model: 'status', cmd:'getRecord', where:[{
                    col:'entity_type_id', op:'=', val:"3"
                  }]
                }
              },
          }
      }
  }
}
*/
module.exports = function(request, reply) {
  //1- check permission from configured plugin authotize
  //2- prepare basic promise props with seneca command (args, relations, where, options, etc)
  //3- add side loads of other seneca promise props from request config
  //4- override extra arguments for main seneca command request parameters
  //5- call perExecute
  //6- execute seneca query command
  //7- call postExecute
  //8- send back results in specific format
  
  // the idea is to expect that user wants to send multiple requests to seneca microservices
  // we will use this object to define several seneca actions (command pattern)
  // to be executed together using prmise.prop
  var seneca_actions = {};

  // check route.request.route.settings.plugins.model
  assert(_.has(request,'route.settings.plugins.model'), 'route config path [route.settings.plugins.model] is undefined, cannot proceed with entitySenecaController.getRecord()');

  var plugins = request.route.settings.plugins;
  var model_name = plugins.model;
  var model_name_plural = inflect.pluralize(model_name);
  
  var args = _.get(plugins, 'args',null);
  var action = _.get(plugins, 'action',null);
  var sideActions = _.get(plugins, 'sideActions',null);





  // ************************************** prepare main action
  var seneca_main_action = {
      role:'database', model: model_name, cmd:'getRecord', id: request.params.id, relations: [], where: []
  };

  if(_.isPlainObject(args)) {
    _.extend(seneca_main_action, args);
  }

  // select specific columns
  if(request.query.columns){
    seneca_main_action.columns = request.query.columns;
  }

  // call user defined method with action pattern, so user can modify the action finally before it is sent
  if(_.isFunction(action)) {
    action(request, reply, seneca_main_action);
  }
  
  // add seneca main action to action list for execution
  seneca_actions[model_name] = seneca_main_action;




  


  // ************************************** side actions
  // merge sideActions with main seneca_actions
  if(_.isArray(sideActions)) {
    seneca_actions = _.assign(seneca_actions, sideActions);
  } else if(_.isFunction(sideActions)) {
    sideActions(request, reply, seneca_actions);
  }




  // transform seneca_commands into actual promises
  var seneca_promises = _.reduce(seneca_actions, function(final_result, value, key) {
    // value => command pattern
    final_result[key] = seneca.actAsync(value);
    return final_result;
  }, {});


  // execute the promises then get responses from microservice
  promise.props(seneca_promises)
    .then(function(seneca_responses){
        var tray = _.reduce(seneca_responses, function(final_result, value, key) {
          // value => records || record
          final_result[key] = value.records || value.record || value;
          return final_result;
        }, {});
        reply(tray);
    }).catch(function(err){
        console.log('EEEEEEEEEEEEEEEEEEEEEEEEERORRRRRRRRRRRRRRR', err);
        if(err.message == 'unauthorized') {
            reply(Boom.unauthorized('you are unauthorized to manage system'));
        } else {
            reply(Boom.badImplementation('Error occured ,,,'));
        }
    });
};