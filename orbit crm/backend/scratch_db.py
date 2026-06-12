import sqlite3

conn = sqlite3.connect('c:/Users/hrida/Documents/Xeno Assignment/orbit crm/backend/xeno_crm.db')
cursor = conn.cursor()

# List campaigns
cursor.execute("SELECT id, name, status FROM campaigns")
campaigns = cursor.fetchall()
print("Campaigns:")
for c in campaigns:
    print(c)

# List columns in campaigns to verify structure
cursor.execute("PRAGMA table_info(campaigns)")
columns = cursor.fetchall()
print("\nCampaign columns:")
for col in columns:
    print(col)

conn.close()
