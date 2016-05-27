(function(global, Rekord, undefined)
{
  var Model = Rekord.Model;
  var Collection = Rekord.Collection;
  var Promise = Rekord.Promise;
  var Events = Rekord.Events;

  var isArray = Rekord.isArray;
  var toArray = Rekord.toArray;
  var isFunction = Rekord.isFunction;
  var isEmpty = Rekord.isEmpty;

  var copy = Rekord.copy;
  var noop = Rekord.noop;

  var indexOf = Rekord.indexOf;

function ApplicationMigrator(name, dependents, stores, datas)
{
  this.name = name;
  this.dependents = dependents;
  this.stores = stores;
  this.datas = datas;
  this.safe = false;
}

ApplicationMigrator.prototype =
{
  create: function(name, creator)
  {
    this.requireNotExists( name );

    this.datas[ name ] = new Collection( creator() );
  },

  drop: function(name)
  {
    this.requireExists( name );

    if ( name in this.datas )
    {
      this.datas[ name ].clear();
    }
  },

  rename: function(fromName, toName)
  {
    this.requireExists( fromName );
    this.requireNotExists( toName );

    if ( fromName in this.datas )
    {
      this.datas[ toName ] = this.datas[ fromName ];
      this.datas[ fromName ] = new Collection();
    }
  },

  migrate: function(name, migrator)
  {
    this.requireExists( name );

    if ( name in this.stores )
    {
      return migrator( new ModelMigrator( this, name, this.stores[ name ], this.datas[ name ] ) );
    }
  },

  newRecord: function(props, status)
  {
    props.$saved = copy( props );
    props.$status = status || Model.Status.Synced;

    return props;
  },

  requireExists: function(name)
  {
    if ( !this.safe )
    {
      if ( indexOf( this.dependents, name ) === false )
      {
        throw 'A migration for ' + name + ' was attempted but did not exist in the dependencies array';
      }
      if ( !(name in this.stores) )
      {
        throw 'A migration for ' + name + ' was attempted but does not exist locally (or was not defined)';
      }
    }
  },

  requireNotExists: function(name)
  {
    if ( !this.safe )
    {
      if ( indexOf( this.dependents, name ) === false )
      {
        throw 'A creation migration for ' + name + ' was attempted but did not exist in the dependencies array';
      }
      /* A store should exist - since they have a Rekord definition
      if ( name in this.stores )
      {
        throw 'A creation migration for ' + name + ' was attempted but already exists';
      }
      */
    }
  }
};

function ModelMigrator(app, name, store, data)
{
  this.app = app;
  this.name = name;
  this.store = store;
  this.data = data;
  this.migrateRemovePending = false;
}

ModelMigrator.prototype =
{

  drop: function(fieldInput)
  {
    var fields = toArray( fieldInput );

    return this.transform(function(record)
    {
      for (var i = 0; i < fields.length; i++)
      {
        this.removeField( record, fields[ i ] );
      }
    });
  },

  add: function(field, defaultValue)
  {
    if ( isFunction( defaultValue ) )
    {
      return this.transform(function(record)
      {
        this.setField( record, field, defaultValue( record ) );
      });
    }
    else
    {
      return this.transform(function(record)
      {
        this.setField( record, field, copy( defaultValue ) );
      });
    }
  },

  rename: function(oldField, newField)
  {
    return this.transform(function(record)
    {
      this.setField( record, newField, record[ oldField ] );
      this.removeField( record, oldField );
    });
  },

  convert: function(field, converter)
  {
    return this.transform(function(record)
    {
      this.setField( record, field, converter( record[ field ], record ) );
    });
  },

  filter: function(filter)
  {
    return this.transform(function(record)
    {
      return !!filter( record );
    });
  },

  setField: function(record, field, value)
  {
    if (record.$saved)
    {
      record.$saved[ field ] = value;
    }

    record[ field ] = value;
  },

  removeField: function(record, field)
  {
    if (record.$saved)
    {
      delete record.$saved[ field ];
    }

    delete record[ field ];
  },

  transform: function(transformer)
  {
    var data = this.data;

    for (var i = 0; i < data.length; i++)
    {
      var record = data[ i ];

      if ( this.migrateRemovePending || record.$status !== Model.Status.RemovePending )
      {
        var result = transformer.call( this, record );

        if ( result === false )
        {
          data.splice( i--, 1 );
        }
      }
    }

    return this;
  }

};


// override Rekord.load
// don't run loadBegin & loadFinish until migrations are loaded, compared to given, and given are ran

Rekord.load = function(callback, context)
{
  var promise = Rekord.loadPromise = Rekord.loadPromise || new Promise( null, false );
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

    // Make available to other functions.
    migrationsLoaded = migrations;

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
            modelKeys[ k ] = modelDatabase.buildKeyFromInput( modelData[ k ] );
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
      if ( global.console && global.console.log )
      {
        global.console.log( migrationLogs );
      }

      Rekord.trigger( Events.MigrationsTested, [migrationLogs] );
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


var Migrations = [];
var MigrationMap = {};

var migrationLogs = [];

function migration(name, dependencies, migrate)
{
  var definition = {
    name: name,
    dependencies: dependencies,
    migrate: migrate
  };

  MigrationMap[ name ] = Migrations.length;
  Migrations.push( definition );
}

function migrationsClear()
{
  MigrationMap = {};
  Migrations.length = 0;
}


  Events.MigrationsLoaded       = 'migrations-loaded';
  Events.MigrationRan           = 'migration-ran';
  Events.MigrationClassNotFound = 'migration-class-not-found';
  Events.MigrationsSaved        = 'migrations-saved';
  Events.MigrationsTested       = 'migrations-tested';
  Events.MigrationsNotLoaded    = 'migrations-not-loaded';
  Events.MigrationsFinished     = 'migrations-finished';

  Rekord.migrationTest = false;
  Rekord.migrationStore = 'migrations';

  Rekord.migration = migration;
  Rekord.migrationsClear = migrationsClear;
  Rekord.Migrations = Migrations;

  Rekord.ApplicationMigrator = ApplicationMigrator;
  Rekord.ModelMigrator = ModelMigrator;

})(this, Rekord);
