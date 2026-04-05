import type { SupabaseClient, User } from "@supabase/supabase-js";

export const normalizeWalletAddress = (value?: string | null) =>
  value?.trim().toLowerCase() || "";

export async function resolveUserWalletAddress(
  supabase: SupabaseClient,
  user: User,
): Promise<string> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("wallet_address")
    .eq("id", user.id)
    .maybeSingle();

  const profileWallet = normalizeWalletAddress(profile?.wallet_address);
  if (profileWallet) {
    return profileWallet;
  }

  const metadataWallet = normalizeWalletAddress(
    typeof user.user_metadata?.wallet_address === "string"
      ? user.user_metadata.wallet_address
      : null,
  );
  if (metadataWallet) {
    return metadataWallet;
  }

  const { data: latestMessageWithWallet } = await supabase
    .from("messages")
    .select("wallet_address")
    .eq("user_id", user.id)
    .not("wallet_address", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return normalizeWalletAddress(latestMessageWithWallet?.wallet_address);
}
