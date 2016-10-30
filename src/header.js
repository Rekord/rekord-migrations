// UMD (Universal Module Definition)
(function (root, factory)
{
  if (typeof define === 'function' && define.amd) // jshint ignore:line
  {
    // AMD. Register as an anonymous module.
    define(['Rekord'], function(Rekord) { // jshint ignore:line
      return factory(root, Rekord);
    });
  }
  else if (typeof module === 'object' && module.exports)  // jshint ignore:line
  {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory(global, require('Rekord'));  // jshint ignore:line
  }
  else
  {
    // Browser globals (root is window)
    root.Rekord = factory(root, root.Rekord);
  }
}(this, function(global, Rekord, undefined)
{
  
  var Model = Rekord.Model;
  var Collection = Rekord.Collection;
  var Promise = Rekord.Promise;
  var Events = Rekord.Events;

  var isArray = Rekord.isArray;
  var isObject = Rekord.isObject;
  var toArray = Rekord.toArray;
  var isFunction = Rekord.isFunction;
  var isEmpty = Rekord.isEmpty;

  var copy = Rekord.copy;
  var noop = Rekord.noop;

  var indexOf = Rekord.indexOf;
  var propsMatch = Rekord.propsMatch;
