var Logger;

try {
  Logger = Java.type('com.luxms.bi.service.LPEService')
} catch (err) {}

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

function log() {
  var message = prepareOutput.apply(this, arguments);
  if(Logger) {
    Logger.log(message);
  } else {
    print(message);
  }
}

export default {
  log: log,
  warn: log,
  error: log
};
