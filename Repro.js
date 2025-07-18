import * as SQLite from "expo-sqlite";
import { useCallback, useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";

export function Repro() {
  const [db, setDb] = useState(null);
  const [todos, setTodos] = useState([]);
  const [filteredTodos, setFilteredTodos] = useState([]);

  const open = useCallback(
    async (options) => {
      try {
        if (db) {
          return;
        }

        setDb(await SQLite.openDatabaseAsync("test.db", options));
      } catch (e) {
        console.error(e);
      }
    },
    [db],
  );

  const setup = useCallback(async () => {
    try {
      if (!db) {
        return;
      }

      await db.execAsync(`PRAGMA journal_mode = 'wal'`);

      console.log("Cleanup");
      await db.execAsync(`DROP TABLE IF EXISTS todos`);
      await db.execAsync(`DROP TABLE IF EXISTS todos_fts`);

      console.log("Create table");
      await db.execAsync(
        `CREATE TABLE IF NOT EXISTS todos (id INTEGER PRIMARY KEY NOT NULL, value TEXT NOT NULL)`,
      );
      await db.runAsync(
        "INSERT INTO todos (id, value) VALUES (?, ?)",
        1,
        "hello",
      );
      await db.runAsync(
        "INSERT INTO todos (id, value) VALUES (?, ?)",
        2,
        "world",
      );
      await db.runAsync(
        "INSERT INTO todos (id, value) VALUES (?, ?)",
        3,
        "hello world",
      );

      console.log("Create FTS table");
      await db.execAsync(
        `CREATE VIRTUAL TABLE IF NOT EXISTS todos_fts USING fts5(id, value)`,
      );
      await db.runAsync(
        "INSERT INTO todos_fts (id, value) VALUES (?, ?)",
        1,
        "hello",
      );
      await db.runAsync(
        "INSERT INTO todos_fts (id, value) VALUES (?, ?)",
        2,
        "world",
      );
      await db.runAsync(
        "INSERT INTO todos_fts (id, value) VALUES (?, ?)",
        3,
        "hello world",
      );

      console.log("Lookup");
      const results = await db.getAllAsync("SELECT id, value from todos");
      console.log(results);
      setTodos(results);

      console.log("Lookup in FTS table");
      const filteredResults = await db.getAllAsync(
        "SELECT id, highlight(todos_fts, 1, '*', '*') AS value FROM todos_fts('world')",
      );
      console.log(filteredResults);
      setFilteredTodos(filteredResults);
    } catch (e) {
      console.error(e);
    }
  }, [db]);

  const close = useCallback(async () => {
    try {
      if (!db) {
        return;
      }

      await db.closeAsync();
      setDb(null);
    } catch (e) {
      console.error(e);
    }
  }, [db]);

  return (
    <View>
      <Button
        onPress={() => open({})}
        title="Open with default options"
        disabled={!!db}
      />
      <Button
        onPress={() =>
          open({
            finalizeUnusedStatementsBeforeClosing: false,
          })
        }
        title="Open without auto finalize"
        disabled={!!db}
      />
      <Button onPress={setup} title="Use FTS" disabled={!db} />
      <Button onPress={close} title="Close" disabled={!db} />

      <View style={styles.container}>
        <Text>All Todos:</Text>
        {todos.map((row) => (
          <Text key={row.id}>- {row.value}</Text>
        ))}
      </View>

      <View style={styles.container}>
        <Text>Todos matching world:</Text>
        {filteredTodos.map((row) => (
          <Text key={row.id}>- {row.value}</Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
});
