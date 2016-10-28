/* rekord-migrations 1.4.1 - Migrations for rekord by Philip Diffenderfer */
(function(global, Rekord, undefined)
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
    var valid = this.requireNotExists( name );

    if ( valid )
    {
      var created = this.datas[ name ] = new Collection( creator() );

      if ( Rekord.migrationTest )
      {
        migrationLog( 'new store ' + name + ' created  (' + created.length + ' records)', created );
      }
    }
  },

  drop: function(name)
  {
    var valid = this.requireExists( name );

    if ( valid )
    {
      var dropping = this.datas[ name ];

      if ( Rekord.migrationTest )
      {
        migrationLog( 'store ' + name + ' dropped (' + dropping.length + ' records)', dropping.slice() );
      }

      dropping.clear();
    }
  },

  rename: function(fromName, toName)
  {
    var valid = this.requireExists( fromName ) && this.requireNotExists( toName );

    if ( valid )
    {
      var fromDatas = this.datas[ fromName ];

      this.datas[ toName ] = fromDatas;
      this.datas[ fromName ] = new Collection();

      if ( Rekord.migrationTest )
      {
        migrationLog( 'store ' + fromName + ' renamed to ' + toName + ' (' + fromDatas.length + ' records)', fromDatas );
      }
    }
  },

  moveRelatedOut: function(fromName, field, intoName)
  {
    var valid = this.requireExists( fromName ) && this.requireNotExists( intoName );

    if ( valid )
    {
      var fromDatas = this.datas[ fromName ];
      var intoDatas = this.datas[ intoName ];

      for (var i = 0; i < fromDatas.length; i++)
      {
        var record = fromDatas[ i ];
        var related = record[ field ];

        if ( isArray( related ) )
        {
          intoDatas.addAll( related );
        }
        else if ( isObject( related ) )
        {
          intoDatas.add( related );
        }

        delete record[ field ];
      }

      if ( Rekord.migrationTest )
      {
        migrationLog( 'store ' + intoName + ' populated from the records located in the ' + field + ' property of the ' + fromName + ' store (' + intoDatas.length + ' records)', intoDatas );
      }
    }
  },

  moveRelatedIn: function(fromName, fromKey, intoName, intoKey, field, many)
  {
    var valid = this.requireExists( fromName ) && this.requireExists( intoName );

    if ( valid )
    {
      var fromDatas = this.datas[ fromName ];
      var intoDatas = this.datas[ intoName ];
      var totalRelated = 0;

      for (var i = 0; i < intoDatas.length; i++)
      {
        var record = intoDatas[ i ];
        var related = fromDatas.where(function(fromModel) // jshint ignore:line
        {
          return propsMatch(fromModel, fromKey, record, intoKey);
        });

        record[ field ] = many ? related : related[0];
        totalRelated += related.length;
      }

      if ( Rekord.migrationTest )
      {
        migrationLog( 'store ' + fromName + ' moved into ' + intoName + ' to property ' + field + ' (' + totalRelated + ' matched, ' + (fromDatas.length - totalRelated) + ' unmatched)', fromDatas.slice() );
      }

      fromDatas.clear();
    }
  },

  migrate: function(name, migratorCallback)
  {
    var valid = this.requireExists( name );

    if ( valid )
    {
      var migrator = new ModelMigrator( this, name, this.stores[ name ], this.datas[ name ] );

      if ( Rekord.migrationTest )
      {
        migrationLog( 'store ' + name + ' migration start', migrator );
      }

      var result = migratorCallback.call( migrator, migrator );

      if ( Rekord.migrationTest )
      {
        migrationLog( 'store ' + name + ' migration end', migrator );
      }

      return result;
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
    var exists = indexOf( this.dependents, name ) !== false;

    if ( Rekord.migrationTest )
    {
      migrationLog( 'ensuring store for ' + name + ' exists in ' + (this.safe ? 'safe' : 'strict') + ' mode', exists );
    }

    if ( !this.safe )
    {
      if ( !exists )
      {
        throw 'A migration for ' + name + ' was attempted but did not exist in the dependencies array';
      }
    }

    return exists;
  },

  requireNotExists: function(name)
  {
    var exists = indexOf( this.dependents, name ) !== false;
    var empty = this.datas[ name ].length === 0;

    if ( Rekord.migrationTest )
    {
      migrationLog( 'ensuring store for ' + name + ' does not exist yet in ' + (this.safe ? 'safe' : 'strict') + ' mode', exists && empty );
    }

    if ( !this.safe )
    {
      if ( !exists )
      {
        throw 'A creation migration for ' + name + ' was attempted but did not exist in the dependencies array';
      }
      if ( !empty )
      {
        throw 'A creation migration for ' + name + ' was attempted but existing data was found';
      }
    }

    return exists && empty;
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

    if ( Rekord.migrationTest )
    {
      migrationLog( 'dropping fields', fields );
    }

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
      if ( Rekord.migrationTest )
      {
        migrationLog( 'adding new field with dynamic default value: ' + defaultValue );
      }

      return this.transform(function(record)
      {
        this.setField( record, field, defaultValue( record ) );
      });
    }
    else
    {
      if ( Rekord.migrationTest )
      {
        migrationLog( 'adding new field with constant default value', defaultValue );
      }

      return this.transform(function(record)
      {
        this.setField( record, field, copy( defaultValue ) );
      });
    }
  },

  rename: function(oldField, newField)
  {
    if ( Rekord.migrationTest )
    {
      migrationLog( 'renaming field from ' + oldField + ' to ' + newField );
    }

    return this.transform(function(record)
    {
      this.setField( record, newField, record[ oldField ] );
      this.removeField( record, oldField );
    });
  },

  convert: function(field, converter)
  {
    if ( Rekord.migrationTest )
    {
      migrationLog( 'converting field ' + field + ': ' + converter );
    }

    return this.transform(function(record)
    {
      this.setField( record, field, converter( record[ field ], record ) );
    });
  },

  filter: function(filter)
  {
    if ( Rekord.migrationTest )
    {
      migrationLog( 'filtering records: ' + filter );
    }

    return this.transform(function(record)
    {
      return !!filter( record );
    });
  },

  setField: function(record, field, value)
  {
    if ( Rekord.migrationTest )
    {
      if (record.$saved)
      {
        migrationLog( 'set field ' + field + ' to ' + value + ' where saved value was ' + record.$saved[ field ] + ' and stored value was ' + record[ field ], record );
      }
      else
      {
        migrationLog( 'set field ' + field + ' to ' + value + ' where stored value was ' + record[ field ], record );
      }
    }

    if (record.$saved)
    {
      record.$saved[ field ] = value;
    }

    record[ field ] = value;
  },

  removeField: function(record, field)
  {
    if ( Rekord.migrationTest )
    {
      if (record.$saved)
      {
        migrationLog( 'remove field ' + field + ' where saved value was ' + record.$saved[ field ] + ' and stored value was ' + record[ field ], record );
      }
      else
      {
        migrationLog( 'remove field ' + field + ' where stored value was ' + record[ field ], record );
      }
    }

    if (record.$saved)
    {
      delete record.$saved[ field ];
    }

    delete record[ field ];
  },

  transform: function(transformer)
  {
    var data = this.data;

    if ( Rekord.migrationTest )
    {
      migrationLog( 'running transform: ' + transformer );
    }

    for (var i = 0; i < data.length; i++)
    {
      var record = data[ i ];

      if ( this.migrateRemovePending || record.$status !== Model.Status.RemovePending )
      {
        var result = transformer.call( this, record );

        if ( result === false )
        {
          if ( Rekord.migrationTest )
          {
            migrationLog( 'removing record', record );
          }

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

function migrationLog()
{
  migrationLogs.push( Array.prototype.slice.call( arguments ) );
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
  Rekord.migrationLogs = migrationLogs;

  Rekord.Migrations = Migrations;

  Rekord.ApplicationMigrator = ApplicationMigrator;
  Rekord.ModelMigrator = ModelMigrator;

})(this, this.Rekord);
