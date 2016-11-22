function ModelMigrator(app, name, store, data)
{
  this.app = app;
  this.name = name;
  this.store = store;
  this.data = data;
  this.migrateRemovePending = false;
}

Class.create( ModelMigrator,
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

});
