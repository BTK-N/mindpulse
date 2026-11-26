import sqlite3

conn = sqlite3.connect("users.db")
c = conn.cursor()
print("--- SCHEMA ---")
c.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='history'")
print(c.fetchone()[0])
print("--- COUNT ---")
c.execute("SELECT COUNT(1) FROM history WHERE username='democlient'")
print(c.fetchone()[0])
print("--- COLUMNS ---")
c.execute("PRAGMA table_info(history)")
for col in c.fetchall():
    print(col)
conn.close()
