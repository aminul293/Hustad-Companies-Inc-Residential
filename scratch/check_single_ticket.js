require('dotenv').config({ path: '.env.local' });
const token = process.env.CENTERPOINT_API_KEY;
const CP_BASE = "https://api.centerpointconnect.io/centerpoint";

async function run() {
  if (!token) return;
  const name = "1329952";
  const params = new URLSearchParams({
    "filter[name]": name
  });
  const res = await fetch(`${CP_BASE}/services?${params}`, {
    headers: {
      "Authorization": token,
      "Accept": "application/json"
    }
  });

  if (!res.ok) {
    console.error("HTTP error:", res.status, await res.text());
    return;
  }
  const data = await res.json();
  console.log("Services matched:", data?.data?.length);
  if (data?.data && data.data.length > 0) {
    const item = data.data[0];
    console.log("Item ID:", item.id);
    console.log("Item Attributes:", JSON.stringify(item.attributes, null, 2));
  } else {
    console.log("No services matched name 1329952");
  }
}
run();
