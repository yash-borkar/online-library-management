import { MongoClient } from "mongodb";

const host = process.env.MONGO_HOST || "database";
const directUri = `mongodb://${host}:27017/?directConnection=true`;
const rsUri = `mongodb://${host}:27017/?replicaSet=rs0`;

async function ensureReplicaSet() {
  const client = new MongoClient(directUri, { serverSelectionTimeoutMS: 120000 });
  await client.connect();
  const admin = client.db("admin");
  try {
    const st = await admin.command({ replSetGetStatus: 1 });
    console.log("Replica set status:", st.members?.[0]?.stateStr);
  } catch {
    console.log("Initializing replica set rs0...");
    await admin.command({
      replSetInitiate: {
        _id: "rs0",
        members: [{ _id: 0, host: `${host}:27017` }],
      },
    });
  }
  await client.close();

  for (let i = 0; i < 45; i++) {
    const c = new MongoClient(rsUri, { serverSelectionTimeoutMS: 15000 });
    try {
      await c.connect();
      const st = await c.db("admin").command({ replSetGetStatus: 1 });
      const state = st.members?.[0]?.stateStr;
      if (state === "PRIMARY") {
        console.log("MongoDB PRIMARY ready");
        return;
      }
      console.log("Waiting for PRIMARY, state=", state);
    } catch (e) {
      console.log("Wait attempt", i + 1, String(e?.message || e));
    } finally {
      try {
        await c.close();
      } catch {
        /* ignore */
      }
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("Replica set did not reach PRIMARY in time");
}

await ensureReplicaSet();
