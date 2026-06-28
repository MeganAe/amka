import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

let clientInstance: any = null;

function getClient() {
  if (!clientInstance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";
    
    clientInstance = createClientComponentClient({
      supabaseUrl: url,
      supabaseKey: anonKey,
    });
  }
  return clientInstance;
}

// Lazy initialization wrapper using a Proxy to prevent module-level crashes during Vercel build-time static generation.
export const supabase = new Proxy({} as any, {
  get(target, prop, receiver) {
    const inst = getClient();
    const value = Reflect.get(inst, prop, receiver);
    if (typeof value === "function") {
      return value.bind(inst);
    }
    return value;
  },
  set(target, prop, value, receiver) {
    const inst = getClient();
    return Reflect.set(inst, prop, value, receiver);
  }
});
