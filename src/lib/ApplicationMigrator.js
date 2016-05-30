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

  moveRelatedOut: function(fromName, field, intoName)
  {
    this.requireExists( fromName );
    this.requireNotExists( intoName );

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
  },

  moveRelatedIn: function(fromName, fromKey, intoName, intoKey, field, many)
  {
    this.requireExists( fromName );
    this.requireExists( intoName );

    var fromDatas = this.datas[ fromName ];
    var intoDatas = this.datas[ intoName ];

    for (var i = 0; i < intoDatas.length; i++)
    {
      var record = intoDatas[ i ];
      var related = fromDatas.where(function(fromModel)
      {
        return propsMatch(fromModel, fromKey, record, intoKey);
      });

      record[ field ] = many ? related : related[0];
    }

    fromDatas.clear();
  },

  migrate: function(name, migratorCallback)
  {
    this.requireExists( name );

    if ( name in this.stores )
    {
      var migrator = new ModelMigrator( this, name, this.stores[ name ], this.datas[ name ] );

      return migratorCallback.call( migrator, migrator );
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
