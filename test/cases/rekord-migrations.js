module( 'Rekord Migrations' );

function newRecord(obj)
{
  obj.$status = Rekord.Model.Status.Synced;
  obj.$saved = Rekord.copy( obj );

  return obj;
}

test( 'simple example', function(assert)
{
  var prefix = 'simple_example_';
  var TodoName = prefix + 'todos';
  var MigrationsName = prefix + 'migrations';

  var TodoStore = Rekord.store[ TodoName ] = new TestStore();

  TodoStore.map.put(1, newRecord({id: 1, name: 't1', done: true}));
  TodoStore.map.put(2, newRecord({id: 2, name: 't2', done: false}));

  Rekord.migrationStore = MigrationsName;
  Rekord.migration('m1', [TodoName], function(migrator, datas)
  {
    migrator.migrate(TodoName, function(todos) {
      todos.convert('done', function(value) {
        return value ? 'Y' : 'N';
      });
    });
  });

  var Todo = Rekord({
    name: TodoName,
    fields: ['name', 'done']
  });

  expect( 9 );

  var off1 = Rekord.on( Rekord.Events.MigrationsLoaded, function(migrations)
  {
    deepEqual( migrations, [], 'no existing migrations' );
  });

  var off2 = Rekord.on( Rekord.Events.MigrationRan, function(migrationName, migrator)
  {
    strictEqual( migrationName, 'm1' );
  });

  var off3 = Rekord.on( Rekord.Events.MigrationsSaved, function(map)
  {
    ok( map, 'migrations saved' );
  });

  var off4 = Rekord.on( Rekord.Events.MigrationsFinished, function()
  {
    ok( true, 'migrations finished' );
  });

  Rekord.load();

  var t1 = Todo.get(1);
  var t2 = Todo.get(2);

  strictEqual( t1.done, 'Y', 'true converted to Y' );
  strictEqual( t2.done, 'N', 'false converted to N' );

  deepEqual( TodoStore.map.get(1), newRecord({id: 1, name: 't1', done: 'Y'}) );
  deepEqual( TodoStore.map.get(2), newRecord({id: 2, name: 't2', done: 'N'}) );

  var MigrationStore = Rekord.store[ MigrationsName ];

  strictEqual( MigrationStore.map.get( 'm1' ), 'm1', 'migration saved' );

  off1(); off2(); off3(); off4();

  Rekord.migrationsClear();
});

test( 'field convert', function(assert)
{
  var prefix = 'field_convert_';
  var TodoName = prefix + 'todos';
  var MigrationsName = prefix + 'migrations';

  var TodoStore = Rekord.store[ TodoName ] = new TestStore();

  TodoStore.map.put(1, newRecord({id: 1, name: 't1', done: true}));
  TodoStore.map.put(2, newRecord({id: 2, name: 't2', done: false}));

  Rekord.migrationStore = MigrationsName;
  Rekord.migration('m1', [TodoName], function(migrator, datas)
  {
    migrator.migrate(TodoName, function(todos) {
      todos.convert('done', function(value) {
        return value ? 'Y' : 'N';
      });
    });
  });

  var Todo = Rekord({
    name: TodoName,
    fields: ['name', 'done']
  });

  Rekord.load();

  var t1 = Todo.get(1);
  var t2 = Todo.get(2);

  strictEqual( t1.done, 'Y', 'true converted to Y' );
  strictEqual( t2.done, 'N', 'false converted to N' );

  Rekord.migrationsClear();
});

test( 'field drop', function(assert)
{
  var prefix = 'field_drop_';
  var TodoName = prefix + 'todos';
  var MigrationsName = prefix + 'migrations';

  var TodoStore = Rekord.store[ TodoName ] = new TestStore();

  TodoStore.map.put(1, newRecord({id: 1, name: 't1', done: true, due: 'now'}));
  TodoStore.map.put(2, newRecord({id: 2, name: 't2', done: false, due: 'then'}));

  Rekord.migrationStore = MigrationsName;
  Rekord.migration('m1', [TodoName], function(migrator, datas)
  {
    migrator.migrate(TodoName, function(todos) {
      todos.drop('due');
    });
  });

  var Todo = Rekord({
    name: TodoName,
    fields: ['name', 'done']
  });

  Rekord.load();

  var t1 = Todo.get(1);
  var t2 = Todo.get(2);

  strictEqual( t1.due, undefined, 'due now dropped' );
  strictEqual( t2.due, undefined, 'due then dropped' );

  Rekord.migrationsClear();
});

test( 'field rename', function(assert)
{
  var prefix = 'field_rename_';
  var TodoName = prefix + 'todos';
  var MigrationsName = prefix + 'migrations';

  var TodoStore = Rekord.store[ TodoName ] = new TestStore();

  TodoStore.map.put(1, newRecord({id: 1, name: 't1', doneit: true}));
  TodoStore.map.put(2, newRecord({id: 2, name: 't2', doneit: false}));

  Rekord.migrationStore = MigrationsName;
  Rekord.migration('m1', [TodoName], function(migrator, datas)
  {
    migrator.migrate(TodoName, function(todos) {
      todos.rename('doneit', 'done');
    });
  });

  var Todo = Rekord({
    name: TodoName,
    fields: ['name', 'done']
  });

  Rekord.load();

  var t1 = Todo.get(1);
  var t2 = Todo.get(2);

  strictEqual( t1.done, true, 'true doneit moved to done' );
  strictEqual( t2.done, false, 'false doneit moved to done' );

  strictEqual( t1.doneit, undefined, 'true doneit removed' );
  strictEqual( t2.doneit, undefined, 'false doneit removed' );

  Rekord.migrationsClear();
});

test( 'field add default value', function(assert)
{
  var NOW = 343523;

  var prefix = 'field_add_default_value_';
  var TodoName = prefix + 'todos';
  var MigrationsName = prefix + 'migrations';

  var TodoStore = Rekord.store[ TodoName ] = new TestStore();

  TodoStore.map.put(1, newRecord({id: 1, name: 't1', done: true}));
  TodoStore.map.put(2, newRecord({id: 2, name: 't2', done: false}));

  Rekord.migrationStore = MigrationsName;
  Rekord.migration('m1', [TodoName], function(migrator, datas)
  {
    migrator.migrate(TodoName, function(todos) {
      todos.add('created_at', NOW);
    });
  });

  var Todo = Rekord({
    name: TodoName,
    fields: ['name', 'done', 'created_at']
  });

  Rekord.load();

  var t1 = Todo.get(1);
  var t2 = Todo.get(2);

  strictEqual( t1.created_at, NOW, 'created_at added' );
  strictEqual( t2.created_at, NOW, 'created_at added' );

  Rekord.migrationsClear();
});

test( 'field add default function', function(assert)
{
  var prefix = 'field_add_default_function_';
  var TodoName = prefix + 'todos';
  var MigrationsName = prefix + 'migrations';

  var TodoStore = Rekord.store[ TodoName ] = new TestStore();

  TodoStore.map.put(1, newRecord({id: 1, name: 't1', done_at: 34}));
  TodoStore.map.put(2, newRecord({id: 2, name: 't2', done_at: null}));

  Rekord.migrationStore = MigrationsName;
  Rekord.migration('m1', [TodoName], function(migrator, datas)
  {
    migrator.migrate(TodoName, function(todos) {
      todos.add('done', function(record) {
        return record.done_at ? true : false;
      });
    });
  });

  var Todo = Rekord({
    name: TodoName,
    fields: ['name', 'done', 'done_at']
  });

  Rekord.load();

  var t1 = Todo.get(1);
  var t2 = Todo.get(2);

  strictEqual( t1.done, true, 'true done added' );
  strictEqual( t2.done, false, 'false done added' );

  Rekord.migrationsClear();
});

test( 'field filter', function(assert)
{
  var prefix = 'field_filter_';
  var TodoName = prefix + 'todos';
  var MigrationsName = prefix + 'migrations';

  var TodoStore = Rekord.store[ TodoName ] = new TestStore();

  TodoStore.map.put(1, newRecord({id: 1, name: 't1', done: true}));
  TodoStore.map.put(2, newRecord({id: 2, name: 't2', done: false}));

  Rekord.migrationStore = MigrationsName;
  Rekord.migration('m1', [TodoName], function(migrator, datas)
  {
    migrator.migrate(TodoName, function(todos) {
      todos.filter(function(record) {
        return record.done;
      });
    });
  });

  var Todo = Rekord({
    name: TodoName,
    fields: ['name', 'done', 'done_at']
  });

  Rekord.load();

  var t1 = Todo.get(1);
  var t2 = Todo.get(2);

  ok( t1, 't1 exists' );
  notOk( t2, 't2 does not exist' );

  Rekord.migrationsClear();
});

test( 'model create', function(assert)
{
  var prefix = 'model_create_';
  var TodoName = prefix + 'todos';
  var MigrationsName = prefix + 'migrations';

  Rekord.migrationStore = MigrationsName;
  Rekord.migration('m1', [TodoName], function(migrator, datas)
  {
    migrator.create(TodoName, function() {
      return [
        newRecord({id: 1, name: 't1', done: true}),
        newRecord({id: 2, name: 't2', done: false})
      ];
    });
  });

  var Todo = Rekord({
    name: TodoName,
    fields: ['name', 'done', 'done_at']
  });

  Rekord.load();

  var t1 = Todo.get(1);
  var t2 = Todo.get(2);

  ok( t1, 't1 exists' );
  ok( t2, 't2 exists' );

  Rekord.migrationsClear();
});

test( 'model drop', function(assert)
{
  var prefix = 'model_drop_';
  var TodoName = prefix + 'todos';
  var MigrationsName = prefix + 'migrations';

  var TodoStore = Rekord.store[ TodoName ] = new TestStore();

  TodoStore.map.put(1, newRecord({id: 1, name: 't1', done: true}));
  TodoStore.map.put(2, newRecord({id: 2, name: 't2', done: false}));

  Rekord.migrationStore = MigrationsName;
  Rekord.migration('m1', [TodoName], function(migrator, datas)
  {
    migrator.drop(TodoName);
  });

  Rekord.load();

  strictEqual( TodoStore.map.size(), 0 );

  Rekord.migrationsClear();
});

test( 'model rename', function(assert)
{
  var prefix = 'model_rename_';
  var OldTodoName = prefix + 'old_todos';
  var TodoName = prefix + 'todos';
  var MigrationsName = prefix + 'migrations';

  var OldTodoStore = Rekord.store[ OldTodoName ] = new TestStore();

  OldTodoStore.map.put(1, newRecord({id: 1, name: 't1', done: true}));
  OldTodoStore.map.put(2, newRecord({id: 2, name: 't2', done: false}));

  Rekord.migrationStore = MigrationsName;
  Rekord.migration('m1', [OldTodoName, TodoName], function(migrator, datas)
  {
    migrator.rename(OldTodoName, TodoName);
  });

  var Todo = Rekord({
    name: TodoName,
    fields: ['name', 'done', 'done_at']
  });

  Rekord.load();

  var t1 = Todo.get(1);
  var t2 = Todo.get(2);

  ok( t1, 't1 exists' );
  ok( t2, 't2 exists' );

  Rekord.migrationsClear();
});

test( 'model moveRelatedOut', function(assert)
{
  var prefix = 'model_moveRelatedOut_';
  var TodoName = prefix + 'todos';
  var TodoListName = prefix + 'todo_lists';
  var MigrationsName = prefix + 'migrations';

  var TodoStore = Rekord.store[ TodoName ] = new TestStore();
  var TodoListStore = Rekord.store[ TodoListName ] = new TestStore();

  TodoListStore.map.put(1, newRecord({
    id: 1, name: 'list1',
    todos: [
      newRecord({id: 2, list_id: 1, name: 'task2'}),
      newRecord({id: 3, list_id: 1, name: 'task3'}),
      newRecord({id: 4, list_id: 1, name: 'task4'})
    ]
  }))

  Rekord.migrationStore = MigrationsName;
  Rekord.migration('m1', [TodoName, TodoListName], function(migrator, datas)
  {
    migrator.moveRelatedOut(TodoListName, 'todos', TodoName);
  });

  var Todo = Rekord({
    name: TodoName,
    fields: ['list_id', 'name']
  });

  var TodoList = Rekord({
    name: TodoListName,
    fields: ['name'],
    hasMany: {
      todos: {
        model: Todo,
        foreign: 'list_id'
      }
    }
  });

  Rekord.load();

  strictEqual( TodoStore.map.size(), 3 );

  Rekord.migrationsClear();
});

test( 'model moveRelatedIn', function(assert)
{
  var prefix = 'model_moveRelatedIn_';
  var TodoName = prefix + 'todos';
  var TodoListName = prefix + 'todo_lists';
  var MigrationsName = prefix + 'migrations';

  var TodoStore = Rekord.store[ TodoName ] = new TestStore();
  var TodoListStore = Rekord.store[ TodoListName ] = new TestStore();

  TodoListStore.map.put(1, newRecord({id: 1, name: 'list1'}));
  TodoStore.map.put(2, newRecord({id: 2, list_id: 1, name: 'task2'}));
  TodoStore.map.put(3, newRecord({id: 3, list_id: 1, name: 'task3'}));
  TodoStore.map.put(4, newRecord({id: 4, list_id: 1, name: 'task4'}));

  Rekord.migrationStore = MigrationsName;
  Rekord.migration('m1', [TodoName, TodoListName], function(migrator, datas)
  {
    migrator.moveRelatedIn(TodoName, 'list_id', TodoListName, 'id', 'todos', true);
  });

  var Todo = Rekord({
    name: TodoName,
    fields: ['list_id', 'name'],
    cache: Rekord.Cache.None
  });

  var TodoList = Rekord({
    name: TodoListName,
    fields: ['name'],
    hasMany: {
      todos: {
        model: Todo,
        foreign: 'list_id',
        store: Rekord.Store.Model
      }
    }
  });

  Rekord.load();

  strictEqual( TodoStore.map.size(), 0 );
  strictEqual( TodoList.get(1).todos.length, 3 );

  Rekord.migrationsClear();
});

test( 'field transform', function(assert)
{
  var prefix = 'field_transform_';
  var TodoName = prefix + 'todos';
  var MigrationsName = prefix + 'migrations';

  var TodoStore = Rekord.store[ TodoName ] = new TestStore();

  TodoStore.map.put(1, newRecord({id: 1, name: 't1', done: true}));
  TodoStore.map.put(2, newRecord({id: 2, name: 't2', done: false}));
  TodoStore.map.put(3, newRecord({id: 3, name: 't3', done: false}));

  Rekord.migrationStore = MigrationsName;
  Rekord.migration('m1', [TodoName], function(migrator, datas)
  {
    migrator.migrate(TodoName, function() {
      this.transform(function(todo) {
        if (todo.done === true) {
          return false;
        }
        this.setField( todo, 'done_at', todo.id * 2 );
      });
    });
  });

  var Todo = Rekord({
    name: TodoName,
    fields: ['name', 'done', 'done_at']
  });

  Rekord.load();

  var t1 = Todo.get(1);
  var t2 = Todo.get(2);
  var t3 = Todo.get(3);

  notOk( t1, 't1 does not exist' );
  ok( t2, 't2 exists' );
  ok( t3, 't3 exists' );
  strictEqual( t2.done_at, 4 );
  strictEqual( t3.done_at, 6 );

  Rekord.migrationsClear();
});

test( 'model newRecord', function(assert)
{
  var prefix = 'model_newRekord_';
  var TodoName = prefix + 'todos';
  var MigrationsName = prefix + 'migrations';

  expect( 1 );

  Rekord.migrationStore = MigrationsName;
  Rekord.migration('m1', [TodoName], function(migrator, datas)
  {
    deepEqual( migrator.newRecord({
      id: 3, name: 'name3'
    }), {
      id: 3, name: 'name3',
      $status: 0, $saved: {
        id: 3, name: 'name3'
      }
    });
  });

  var Todo = Rekord({
    name: TodoName,
    fields: ['name', 'done', 'done_at']
  });

  Rekord.load();

  Rekord.migrationsClear();
});

test( 'model drop notExists', function(assert)
{
  var prefix = 'model_drop_notExists_';
  var TodoName = prefix + 'todos';
  var MigrationsName = prefix + 'migrations';

  Rekord.migrationStore = MigrationsName;
  Rekord.migration('m1', [TodoName], function(migrator, datas)
  {
    migrator.drop('nope');
  });

  var Todo = Rekord({
    name: TodoName,
    fields: ['name', 'done', 'done_at']
  });

  throws(function() {
    Rekord.load();
  });

  Rekord.migrationsClear();
});

test( 'model rename notExists', function(assert)
{
  var prefix = 'model_rename_notExists_';
  var TodoName = prefix + 'todos';
  var MigrationsName = prefix + 'migrations';

  Rekord.migrationStore = MigrationsName;
  Rekord.migration('m1', [TodoName], function(migrator, datas)
  {
    migrator.rename('nope', TodoName);
  });

  var Todo = Rekord({
    name: TodoName,
    fields: ['name', 'done', 'done_at']
  });

  throws(function() {
    Rekord.load();
  });

  Rekord.migrationsClear();
});

test( 'model create exists', function(assert)
{
  var prefix = 'model_create_exists_';
  var TodoName = prefix + 'todos';
  var OldTodoName = prefix + 'old_todos';
  var MigrationsName = prefix + 'migrations';

  var TodoStore = Rekord.store[ TodoName ] = new TestStore();
  TodoStore.map.put(1, newRecord({id: 1, name: 'name1'}));

  Rekord.migrationStore = MigrationsName;
  Rekord.migration('m1', [TodoName, OldTodoName], function(migrator, datas)
  {
    migrator.create(TodoName, function() {
      return []
    });
  });

  var Todo = Rekord({
    name: TodoName,
    fields: ['name', 'done', 'done_at']
  });

  throws(function() {
    Rekord.load();
  });

  Rekord.migrationsClear();
});

test( 'model rename exists', function(assert)
{
  var prefix = 'model_rename_exists_';
  var TodoName = prefix + 'todos';
  var OldTodoName = prefix + 'old_todos';
  var MigrationsName = prefix + 'migrations';

  var TodoStore = Rekord.store[ TodoName ] = new TestStore();
  TodoStore.map.put(1, newRecord({id: 1, name: 'name1'}));

  Rekord.migrationStore = MigrationsName;
  Rekord.migration('m1', [TodoName, OldTodoName], function(migrator, datas)
  {
    migrator.rename(OldTodoName, TodoName);
  });

  var Todo = Rekord({
    name: TodoName,
    fields: ['name', 'done', 'done_at']
  });

  throws(function() {
    Rekord.load();
  });

  Rekord.migrationsClear();
});

test( 'model rename notExists', function(assert)
{
  var prefix = 'model_rename_notExists_';
  var TodoName = prefix + 'todos';
  var MigrationsName = prefix + 'migrations';

  var TodoStore = Rekord.store[ TodoName ] = new TestStore();
  TodoStore.map.put(1, newRecord({id: 1, name: 'name1'}));

  Rekord.migrationStore = MigrationsName;
  Rekord.migration('m1', [TodoName], function(migrator, datas)
  {
    migrator.rename('nope', TodoName);
  });

  var Todo = Rekord({
    name: TodoName,
    fields: ['name', 'done', 'done_at']
  });

  throws(function() {
    Rekord.load();
  });

  Rekord.migrationsClear();
});

test( 'model moveRelatedOut notExists', function(assert)
{
  var prefix = 'model_moveRelatedOut_notExists_';
  var TodoName = prefix + 'todos';
  var MigrationsName = prefix + 'migrations';

  Rekord.migrationStore = MigrationsName;
  Rekord.migration('m1', [TodoName], function(migrator, datas)
  {
    migrator.moveRelatedOut('nope', 'bleh', TodoName);
  });

  var Todo = Rekord({
    name: TodoName,
    fields: ['name', 'done', 'done_at']
  });

  throws(function() {
    Rekord.load();
  });

  Rekord.migrationsClear();
});

test( 'model moveRelatedOut exists', function(assert)
{
  var prefix = 'model_moveRelatedOut_exists_';
  var TodoName = prefix + 'todos';
  var OldTodoName = prefix + 'old_todos';
  var MigrationsName = prefix + 'migrations';

  var TodoStore = Rekord.store[ TodoName ] = new TestStore();
  TodoStore.map.put(1, newRecord({id: 1, name: 'name1'}));

  Rekord.migrationStore = MigrationsName;
  Rekord.migration('m1', [TodoName, OldTodoName], function(migrator, datas)
  {
    migrator.moveRelatedOut(OldTodoName, 'bleh', TodoName);
  });

  var Todo = Rekord({
    name: TodoName,
    fields: ['name', 'done', 'done_at']
  });

  throws(function() {
    Rekord.load();
  });

  Rekord.migrationsClear();
});

test( 'model moveRelatedIn notExists from', function(assert)
{
  var prefix = 'model_moveRelatedIn_notExists_from_';
  var TodoName = prefix + 'todos';
  var MigrationsName = prefix + 'migrations';

  Rekord.migrationStore = MigrationsName;
  Rekord.migration('m1', [TodoName], function(migrator, datas)
  {
    migrator.moveRelatedIn('nope');
  });

  var Todo = Rekord({
    name: TodoName,
    fields: ['name', 'done', 'done_at']
  });

  throws(function() {
    Rekord.load();
  });

  Rekord.migrationsClear();
});

test( 'model moveRelatedIn notExists into', function(assert)
{
  var prefix = 'model_moveRelatedIn_notExists_from_';
  var TodoName = prefix + 'todos';
  var MigrationsName = prefix + 'migrations';

  Rekord.migrationStore = MigrationsName;
  Rekord.migration('m1', [TodoName], function(migrator, datas)
  {
    migrator.moveRelatedIn(TodoName, 'id', 'nope');
  });

  var Todo = Rekord({
    name: TodoName,
    fields: ['name', 'done', 'done_at']
  });

  throws(function() {
    Rekord.load();
  });

  Rekord.migrationsClear();
});

test( 'model migrate notExists', function(assert)
{
  var prefix = 'model_migrate_notExists';
  var TodoName = prefix + 'todos';
  var MigrationsName = prefix + 'migrations';

  Rekord.migrationStore = MigrationsName;
  Rekord.migration('m1', [TodoName], function(migrator, datas)
  {
    migrator.migrate('nope', function(nopes) {

    });
  });

  var Todo = Rekord({
    name: TodoName,
    fields: ['name', 'done', 'done_at']
  });

  throws(function() {
    Rekord.load();
  });

  Rekord.migrationsClear();
});

test( 'direct datas manipulation', function(assert)
{
  var prefix = 'direct_data_manipulation_';
  var TodoName = prefix + 'todos';
  var MigrationsName = prefix + 'migrations';

  var TodoStore = Rekord.store[ TodoName ] = new TestStore();

  TodoStore.map.put(1, newRecord({id: 1, name: 't1', done: true}));
  TodoStore.map.put(2, newRecord({id: 2, name: 't2', done: false}));

  Rekord.migrationStore = MigrationsName;
  Rekord.migration('m1', [TodoName], function(migrator, datas)
  {
    var todos = datas[ TodoName ];
    for (var i = 0; i < todos.length; i++) {
      var todo = todos[ i ];
      todo.done = todo.done ? 'Y' : 'N';
    }
  });

  var Todo = Rekord({
    name: TodoName,
    fields: ['name', 'done']
  });

  Rekord.load();

  var t1 = Todo.get(1);
  var t2 = Todo.get(2);

  strictEqual( t1.done, 'Y', 'true converted to Y' );
  strictEqual( t2.done, 'N', 'false converted to N' );

  Rekord.migrationsClear();
});

test( 'ignore existing migration', function(assert)
{
  var prefix = 'ignore_existing_migration_';
  var TodoName = prefix + 'todos';
  var MigrationsName = prefix + 'migrations';

  var MigrationsStore = Rekord.store[ MigrationsName ] = new TestStore();
  MigrationsStore.map.put('m1', 'm1');

  expect(1);

  Rekord.migrationStore = MigrationsName;
  Rekord.migration('m1', [TodoName], function(migrator, datas)
  {
    ok( false, 'migration should not run!' )
  });
  Rekord.migration('m2', [TodoName], function(migrator, datas)
  {
    ok( true, 'migration should run!' )
  });

  var Todo = Rekord({
    name: TodoName,
    fields: ['name', 'done']
  });

  Rekord.load();

  Rekord.migrationsClear();
});

test( 'multiple migrations', function(assert)
{
  var prefix = 'multiple_migrations_';
  var TodoName = prefix + 'todos';
  var MigrationsName = prefix + 'migrations';

  expect(2);

  var migrationCount = 0;

  Rekord.migrationStore = MigrationsName;
  Rekord.migration('m1', [TodoName], function(migrator, datas)
  {
    strictEqual( ++migrationCount, 1 );
  });
  Rekord.migration('m2', [TodoName], function(migrator, datas)
  {
    strictEqual( ++migrationCount, 2 );
  });

  var Todo = Rekord({
    name: TodoName,
    fields: ['name', 'done']
  });

  Rekord.load();

  Rekord.migrationsClear();
});

test( 'test', function(assert)
{
  var prefix = 'test_';
  var TodoName = prefix + 'todos';
  var MigrationsName = prefix + 'migrations';

  var TodoStore = Rekord.store[ TodoName ] = new TestStore();

  TodoStore.map.put(1, newRecord({id: 1, name: 't1', done: true}));
  TodoStore.map.put(2, newRecord({id: 2, name: 't2', done: false}));

  Rekord.migrationTest = true;
  Rekord.migrationStore = MigrationsName;
  Rekord.migration('m1', [TodoName], function(migrator, datas)
  {
    migrator.drop(TodoName);
  });

  Rekord.load();
  Rekord.migrationTest = false;

  strictEqual( TodoStore.map.size(), 2 );
  ok( Rekord.migrationLogs.length );

  Rekord.migrationsClear();
});

test( 'model create safe', function(assert)
{
  var prefix = 'model_create_safe_';
  var TodoName = prefix + 'todos';
  var MigrationsName = prefix + 'migrations';

  var TodoStore = Rekord.store[ TodoName ] = new TestStore();

  TodoStore.map.put(1, newRecord({id: 1, name: 't1', done: true}));
  TodoStore.map.put(2, newRecord({id: 2, name: 't2', done: false}));

  Rekord.migrationStore = MigrationsName;
  Rekord.migration('m1', [TodoName], function(migrator, datas)
  {
    migrator.safe = true;
    migrator.create(TodoName, function() {
      return [
        migrator.newRecord({id: 3, name: 't3', done: true})
      ];
    });
  });

  Rekord.load();

  strictEqual( TodoStore.map.size(), 2 );

  Rekord.migrationsClear();
});

test( 'model drop safe', function(assert)
{
  var prefix = 'model_drop_safe_';
  var TodoName = prefix + 'todos';
  var MigrationsName = prefix + 'migrations';

  Rekord.migrationStore = MigrationsName;
  Rekord.migration('m1', [TodoName], function(migrator, datas)
  {
    migrator.safe = true;
    migrator.drop('nope');

    ok( true, 'no error thrown' );
  });

  Rekord.load();

  Rekord.migrationsClear();
});

test( 'model rename safe', function(assert)
{
  var prefix = 'model_rename_safe_';
  var TodoName = prefix + 'todos';
  var OldTodoName = prefix + 'old_todos';
  var MigrationsName = prefix + 'migrations';

  var TodoStore = Rekord.store[ TodoName ] = new TestStore();

  TodoStore.map.put(1, newRecord({id: 1, name: 't1', done: true}));
  TodoStore.map.put(2, newRecord({id: 2, name: 't2', done: false}));

  Rekord.migrationStore = MigrationsName;
  Rekord.migration('m1', [TodoName, OldTodoName], function(migrator, datas)
  {
    migrator.safe = true;
    migrator.rename('nope', 'noperz');
    migrator.rename(OldTodoName, TodoName);

    ok( true, 'no error thrown' );
  });

  Rekord.load();

  strictEqual( TodoStore.map.size(), 2 );

  Rekord.migrationsClear();
});

test( 'model migrate safe', function(assert)
{
  var prefix = 'model_migrate_safe_';
  var TodoName = prefix + 'todos';
  var MigrationsName = prefix + 'migrations';

  Rekord.migrationStore = MigrationsName;
  Rekord.migration('m1', [TodoName], function(migrator, datas)
  {
    migrator.safe = true;
    migrator.migrate('nope');

    ok( true, 'no error thrown' );
  });

  Rekord.load();

  Rekord.migrationsClear();
});

test( 'promise timing', function(assert)
{
  var timer = assert.timer();
  var prefix = 'promise_timing_';
  var TodoName = prefix + 'todos';
  var MigrationsName = prefix + 'migrations';
  var promise = null;

  var MigrationsStore = Rekord.store[ MigrationsName ] = new TestStore();

  MigrationsStore.delay = 2;

  Rekord.migrationStore = MigrationsName;
  Rekord.migration('m1', [TodoName], function(migrator, datas)
  {
    notOk( promise.isComplete() );
  });

  var Todo = Rekord({
    name: TodoName,
    fields: ['name', 'done']
  });

  promise = Rekord.load();

  notOk( promise.isComplete() );

  wait( 3, function()
  {
    ok( promise.isComplete() );
  });

  timer.run();

  Rekord.migrationsClear();
});
