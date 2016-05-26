
// override Rekord.load
// don't run loadBegin & loadFinish until migrations are loaded, compared to given, and given are ran

Rekord.load = function(callback, context)
{
  var promise = Rekord.loadPromise = Rekord.loadPromise || new Promise( null, false );
  var loading = Rekord.unloaded.slice();

  promise.success( callback, context || this );

  Rekord.unloaded.length = 0;

  var migrationStore = Rekord.store({
    name: Rekord.migrationStore
  });

  // migrationStore.put( key, record, success, failure );

  var stores = {};
  var datas = {};
  var required = {};

  function onMigrationsLoaded(migrations)
  {
    // Remove registered migrations that have already ran
    for (var i = 0; i < migrations.length; i++)
    {
      delete MigrationMap[ migrations[ i ] ];
    }

    // Gather required stores
    for (var migrationName in MigrationMap)
    {
      var definition = Migrations[ MigrationMap[ migrationName ] ];
      var deps = definition.dependencies;

      for (var k = 0; k < deps.length; k++)
      {
        required[ deps[ k ] ] = true;
      }
    }

    // Grab store reference from Rekord - or create one
    // Call all on stores to populated datas with Collection
    // Iterate over Migrations and for each migration that exists in MigrationMap...
    // call migration function passing datas, stores, and new ApplicationMigrator
    // apply changes in datas to the stores if !migrationTest
    // log all changes if migrationTest to console
    // Run all loadBegin
    // When all loadBegins are finished, run loadFinish
    // When all loadFinishes are finished, promise is resolved
  }

  function onMigrationsFailed()
  {
    // throw error?
  }

  migrationStore.all( onMigrationsLoaded, onMigrationsFailed );

  return promise;
};
