require("dotenv").config({ path: ".env.local" });

const CP_BASE = "https://api.centerpointconnect.io/centerpoint";
const key = process.env.CENTERPOINT_API_KEY;

if (!key) {
  console.error("CENTERPOINT_API_KEY is not set");
  process.exit(1);
}

async function run() {
  const id = "2096505"; // Job 1329952
  const url = `${CP_BASE}/services/${id}`;
  
  // Let's try to set status: "accepted" or "opened" first, then see if it changes the displayStatus
  const statusToTest = "accepted"; // or "opened", or "closed"
  console.log(`Patching status to: ${statusToTest}`);
  
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: key
    },
    body: JSON.stringify({
      data: {
        type: "services",
        id: id,
        attributes: {
          status: statusToTest,
          // Let's set some date to see if it triggers the stage transition
          openedAt: new Date().toISOString()
        }
      }
    })
  });
  
  console.log(`Response status: ${res.status}`);
  if (res.ok) {
    const data = await res.json();
    console.log("Updated service attributes:", JSON.stringify(data.data.attributes, null, 2));
  } else {
    console.error("Error patching:", await res.text());
  }
}

run().catch(console.error);
