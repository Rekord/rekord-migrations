
// override Rekord.load
// don't run loadBegin & loadFinish until migrations are loaded, compared to given, and given are ran

Rekord.load = function(callback, context)
{
  var promise = Rekord.loadPromise = new Promise( null, false );
  var loading = Rekord.unloaded.slice();
  var loaded = [];
  var loadedSuccess = [];

  promise.success( callback, context || this );

  Rekord.unloaded.length = 0;

  var migrationStore = Rekord.store( {name: Rekord.migrationStore} );
  var migrationsLoaded = [];
  var stores = {};
  var datas = {};
  var required = {};
  var storeCount = 0;
  var storesLoaded = 0;
  var storesReset = 0;

  function onMigrationsLoaded(migrations)
  {
    Rekord.trigger( Events.MigrationsLoaded, [migrations] );

    if ( Rekord.migrationTest )
    {
      migrationLog( 'migrations loaded', migrations );
    }

    // Make available to other functions.
    migrationsLoaded = migrations;

    // Remove registered migrations that have already ran
    for (var i = 0; i < migrations.length; i++)
    {
      delete MigrationMap[ migrations[ i ] ];
    }

    if ( Rekord.migrationTest )
    {
      migrationLog( 'migrations being ran', MigrationMap );
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
    for (var modelName in required)
    {
      if ( modelName in Rekord.classes )
      {
        stores[ modelName ] = Rekord.classes[ modelName ].Database.store;
      }
      else
      {
        stores[ modelName ] = Rekord.store( {name: modelName} );
      }

      datas[ modelName ] = new Collection();
      storeCount++;
    }

    // Call all on stores to populated datas with Collection
    for (var modelName in stores)
    {
      var handler = handleStoreLoad( modelName );

      stores[ modelName ].all( handler, handler );
    }
  }

  function handleStoreLoad(modelName)
  {
    return function onStoreLoad(data)
    {
      if ( isArray( data ) )
      {
        datas[ modelName ].reset( data );
      }

      if ( Rekord.migrationTest )
      {
        migrationLog( 'store loaded', datas[ modelName ] );
      }

      if ( ++storesLoaded === storeCount )
      {
        onStoresLoaded();
      }
    };
  }

  function onStoresLoaded()
  {
    // Iterate over Migrations and for each migration that exists in MigrationMap...
    for (var i = 0; i < Migrations.length; i++)
    {
      var definition = Migrations[ i ];

      if ( definition.name in MigrationMap )
      {
        var migrator = new ApplicationMigrator( definition.name,
          definition.dependencies, stores, datas );

        if ( Rekord.migrationTest )
        {
          migrationLog( 'running migration ' + definition.name, migrator );
        }

        // call migration function passing datas, stores, and new ApplicationMigrator
        definition.migrate( migrator, datas );

        Rekord.trigger( Events.MigrationRan, [definition.name, migrator] );
      }
    }

    // apply changes in datas to the stores if !migrationTest
    if ( !Rekord.migrationTest )
    {
      for (var modelName in stores)
      {
        var modelStore = stores[ modelName ];
        var modelData = datas[ modelName ];
        var modelKeys = [];
        var modelClass = Rekord.classes[ modelName ];

        if ( modelClass )
        {
          var modelDatabase = modelClass.Database;

          for (var k = 0; k < modelData.length; k++)
          {
            modelKeys[ k ] = modelDatabase.keyHandler.buildKeyFromInput( modelData[ k ] );
          }

          modelStore.reset( modelKeys, modelData, onStoreReset, onStoreReset );
        }
        else if ( modelData.length === 0 )
        {
          modelStore.reset( modelKeys, modelData, onStoreReset, onStoreReset );
        }
        else
        {
          Rekord.trigger( Events.MigrationClassNotFound, [modelName, modelStore, modelData] );

          onStoreReset();
        }
      }

      for (var migrationName in MigrationMap)
      {
        migrationStore.put( migrationName, migrationName, noop, noop );
      }

      Rekord.trigger( Events.MigrationsSaved, [MigrationMap] );
    }
    else
    {
      var console = global.console;

      if ( console && console.log )
      {
        var log = console.log;
        var call = Function.prototype.call;

        for (var i = 0; i < migrationLogs.length; i++)
        {
          migrationLogs[ i ].unshift( console );

          call.apply( log, migrationLogs[ i ] );
        }
      }

      Rekord.trigger( Events.MigrationsTested, [migrationLogs] );

      onNormalLoadProcedure();
    }
  }

  function onStoreReset()
  {
    if ( ++storesReset === storeCount )
    {
      Rekord.trigger( Events.MigrationsFinished, [] );

      onNormalLoadProcedure();
    }
  }

  function onMigrationsFailed()
  {
    Rekord.trigger( Events.MigrationsNotLoaded, [] );

    onNormalLoadProcedure();
  }

  function onNormalLoadProcedure()
  {
    // Run all loadBegin
    for (var i = 0; i < loading.length; i++)
    {
      loading[ i ].loadBegin( onLoadFinish );
    }
  }

  function onLoadFinish(success, db)
  {
    // When all loadBegins are finished, run loadFinish
    loadedSuccess.push( success );
    loaded.push( db );

    if ( loaded.length === loading.length )
    {
      for (var k = 0; k < loaded.length; k++)
      {
        var db = loaded[ k ];
        var success = loadedSuccess[ k ];

        if ( success )
        {
          db.loadFinish();
        }
      }

      // When all loadFinishes are finished, promise is resolved
      promise.reset().resolve();
    }
  }

  migrationStore.all( onMigrationsLoaded, onMigrationsFailed );

  return promise;
};
