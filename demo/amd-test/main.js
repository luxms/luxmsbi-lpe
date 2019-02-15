require.config({
  baseUrl: '../../',
  paths: { 
    //
  },
  waitSeconds: 15
});

require(['lpe'], function(lpep) {
  QUnit.test( "hello test", function( assert ) {
    assert.ok( 1 == "1", "Passed!" );
  });
});
