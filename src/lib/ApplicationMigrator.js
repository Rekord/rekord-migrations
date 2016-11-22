function ApplicationMigrator(name, dependents, stores, datas)
{
  this.name = name;
  this.dependents = dependents;
  this.stores = stores;
  this.datas = datas;
  this.safe = false;
}

Class.create( ApplicationMigrator,
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
});
