
function prepareOutput() {
  var res = '';
  for (var i = 0; i < arguments.length; i++) {
    var arg = arguments[i];
    if (typeof arg == 'string') {
      res += arg;
    } else {
      try {
        res += JSON.stringify(arg);
      } catch(err) {
        res += String(arg);
      }
    }
  }
  return res;
}


export default {
  log: function() {
    var message = prepareOutput.apply(this, arguments);
    plv8.elog(NOTICE, message);
  },
  warn: function() {
    var message = prepareOutput.apply(this, arguments);
    plv8.elog(WARNING, message);
  },
  error: function() {
    var message = prepareOutput.apply(this, arguments);
    plv8.elog(ERROR, message);
  },
};
