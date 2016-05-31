# <img src="https://raw.githubusercontent.com/Rekord/rekord/master/images/rekord-color.png" width="60"> Rekord Migrations

[![Build Status](https://travis-ci.org/Rekord/rekord-migrations.svg?branch=master)](https://travis-ci.org/Rekord/rekord-migrations)
[![devDependency Status](https://david-dm.org/Rekord/rekord-migrations/dev-status.svg)](https://david-dm.org/Rekord/rekord-migrations#info=devDependencies)
[![Dependency Status](https://david-dm.org/Rekord/rekord-migrations.svg)](https://david-dm.org/Rekord/rekord-migrations)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Rekord/rekord-migrations/blob/master/LICENSE)
[![Alpha](https://img.shields.io/badge/State-Alpha-orange.svg)]()

`rekord-migrations` adds migrations to rekord. rekord-migrations enables you to
handle converting records in local storage created in a previous application version to records that work with the current application version.

**When are migrations useful?**

You've...
- changed the data type of a field.
- renamed a field.
- renamed a model class.
- added a new field and want to populate it with a default or calculated value.
- dropped a model and want to remove the old data.
- added a new model and want to pre-populate local storage.
- decided you want to switch whether a model is stored in its own store or in the property of a related model (common with belongsTo and hasOne relationships).

**How do they work?**

When rekord-migrations is included a store created through `Rekord.store` is
made called `migrations` which stores the names of the migrations which have
been ran locally. Migrations are defined by the application programmer and must
be listed in the order of execution. If migrations aren't in the migration
store they are ran against storage data - and once the transformations are made
they are applied back to the storage implementation and normal Rekord loading is
resumed.

**Installation**

The easiest way to install rekord-migrations is through bower via `bower install rekord-migrations`.

- rekord-migrations.js is `16KB` (`3.4KB` gzipped)
- rekord-migrations.min.js is `7KB` (`2.2KB` gzipped)

**Example**

```javascript
// simulate the migration and log all changes
Rekord.migrationTest = true;

// defines which stores need to be loaded and updated with new data
Rekord.migration('migration-name', ['todo', 'todo_list', 'task', 'event'], function(migrator, datas)
{
  // Rekord.Collection that can be directly modified to reset store
  datas.todo;

  // drop a model, no longer used
  migrator.drop( 'task' );

  // populate initial data of new model
  migrator.create( 'event', function() {
    return [
      migrator.newRekord({id: 1, name: 'Birthday'}),
      migrator.newRekord({id: 2, name: 'Holiday'})
    ];
  });

  // rename model
  migrator.rename( 'old_name', 'new_name' );

  // todo should be stored into the todos property of the todo_list model now.
  // remove the todo store once moved
  migrator.moveRelatedIn( 'todo', 'todo_list_id', 'todo_list', 'id', 'todos', true );

  // todo should be taken out of todos in the todo_list model and stored in their own.
  migrator.moveRelatedOut( 'todo_list', 'todos', 'todo' );

  // migrate fields in a model
  migrator.migrate( 'todo', function(todos)
  {
    // remove this field, we don't need it anymore
    todos.drop( 'due_date' );

    // constant default value
    todos.add( 'due', false );

    // dynamic default value
    todos.add( 'due', function(todo) {
      return todo.due_date !== null;
    });

    // changed field name, move value over and remove the old field
    todos.rename( 'title', 'name' );

    // convert data type
    todos.convert( 'assignee', function(todo) {
      // store email instead of user object
      return todo.assignee.email;
    });

    // remove certain todos
    todos.filter(function(todo) {
      return todo.version < 2;
    });

    // custom
    todos.transform(function(todo) {
      this.setField( todo, 'field', value );
      this.removeField( todo, 'field' );
      return false; // return false if we want the todo removed.
    });
  });
});

```
