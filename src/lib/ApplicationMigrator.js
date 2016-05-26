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

    if ( name in this.stores )
    {
      this.stores[ name ].destroy();
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

      delete this.datas[ fromName ];
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
    props.$saved = props;
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
      if ( name in this.stores )
      {
        throw 'A creation migration for ' + name + ' was attempted but already exists';
      }
    }
  }
};
