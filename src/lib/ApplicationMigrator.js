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

    var created = this.datas[ name ] = new Collection( creator() );

    if ( Rekord.migrationTest )
    {
      migrationLog( 'new store ' + name + ' created  (' + created.length + ' records)', created );
    }
  },

  drop: function(name)
  {
    this.requireExists( name );

    var dropping = this.datas[ name ];

    if ( dropping )
    {
      if ( Rekord.migrationTest )
      {
        migrationLog( 'store ' + name + ' dropped (' + dropping.length + ' records)', dropping.slice() );
      }

      dropping.clear();
    }
  },

  rename: function(fromName, toName)
  {
    this.requireExists( fromName );
    this.requireNotExists( toName );

    var fromDatas = this.datas[ fromName ];

    if ( fromDatas )
    {
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
    this.requireExists( fromName );
    this.requireNotExists( intoName );

    var fromDatas = this.datas[ fromName ];
    var intoDatas = this.datas[ intoName ];

    if ( fromDatas && intoDatas )
    {
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
    this.requireExists( fromName );
    this.requireExists( intoName );

    var fromDatas = this.datas[ fromName ];
    var intoDatas = this.datas[ intoName ];
    var totalRelated = 0;

    if ( fromDatas && intoDatas )
    {
      for (var i = 0; i < intoDatas.length; i++)
      {
        var record = intoDatas[ i ];
        var related = fromDatas.where(function(fromModel)
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
    this.requireExists( name );

    if ( name in this.stores )
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
    if ( Rekord.migrationTest )
    {
      migrationLog( 'ensuring store for ' + name + ' exists in ' + (this.safe ? 'safe' : 'strict') + ' mode', indexOf( this.dependents, name ) !== false );
    }

    if ( !this.safe )
    {
      if ( indexOf( this.dependents, name ) === false )
      {
        throw 'A migration for ' + name + ' was attempted but did not exist in the dependencies array';
      }
    }
  },

  requireNotExists: function(name)
  {
    if ( Rekord.migrationTest )
    {
      migrationLog( 'ensuring store for ' + name + ' does not exist yet in ' + (this.safe ? 'safe' : 'strict') + ' mode', indexOf( this.dependents, name ) !== false && this.datas[ name ].length === 0 );
    }

    if ( !this.safe )
    {
      if ( indexOf( this.dependents, name ) === false )
      {
        throw 'A creation migration for ' + name + ' was attempted but did not exist in the dependencies array';
      }
      if ( this.datas[ name ].length !== 0 )
      {
        throw 'A creation migration for ' + name + ' was attempted but existing data was found';
      }
    }
  }
};
