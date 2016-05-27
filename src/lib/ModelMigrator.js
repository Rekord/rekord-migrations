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
