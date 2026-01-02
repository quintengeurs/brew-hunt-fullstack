import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  LogOut,
  Trophy,
  Shield,
  Check,
  X,
  AlertCircle,
  Camera,
  User,
  QrCode,
} from "lucide-react";

const supabaseUrl = "https://eeboxlitezqgjyrnssgx.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlYm94bGl0ZXpxZ2p5cm5zc2d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2NjcyNTksImV4cCI6MjA4MDI0MzI1OX0.8VlGLHjEv_0aGWOjiDuLLziOCnUqciIAEWayMUGsXT8";

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const ADMIN_EMAIL = "quinten.geurs@gmail.com";

const getSafePhotoUrl = (url) => {
  if (!url)
    return "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&h=600&fit=crop";
  if (
    typeof url === "string" &&
    (url.startsWith("http") || url.startsWith("https") || url.startsWith("data:image/"))
  ) {
    return url;
  }
  return "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&h=600&fit=crop";
};

const getTrimClass = (trim) => {
  switch (trim) {
    case "green":
      return "ring-4 ring-green-400/50";
    case "blue":
      return "ring-4 ring-blue-400/50";
    case "purple":
      return "ring-4 ring-purple-500/50";
    case "gold":
      return "ring-4 ring-yellow-400/50";
    default:
      return "";
  }
};

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getTodayLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getYesterdayLocalDate() {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function calculateExpiryDate(startDate, duration) {
  let date;
  if (typeof startDate === 'string' && startDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
    date = new Date(startDate + 'T12:00:00');
  } else {
    date = new Date(startDate);
  }
  
  if (isNaN(date.getTime())) {
    console.error('Invalid start date:', startDate);
    date = new Date();
  }
  
  switch (duration) {
    case "1hour":
      date.setHours(date.getHours() + 1);
      break;
    case "3hours":
      date.setHours(date.getHours() + 3);
      break;
    case "12hours":
      date.setHours(date.getHours() + 12);
      break;
    case "1day":
      date.setDate(date.getDate() + 1);
      break;
    case "3days":
      date.setDate(date.getDate() + 3);
      break;
    case "1week":
      date.setDate(date.getDate() + 7);
      break;
    default:
      date.setDate(date.getDate() + 1);
  }
  
  return date.toISOString();
}

export default function App() {
  const [session, setSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);

  const [hunts, setHunts] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [activeFilter, setActiveFilter] = useState("All");
  const [streak, setStreak] = useState(0);
  const [totalHunts, setTotalHunts] = useState(0);
  const [tier, setTier] = useState("Newbie");
  const [isInfluencer, setIsInfluencer] = useState(false);
  const [lastActive, setLastActive] = useState(null);
  const [currentHunt, setCurrentHunt] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showInfluencerOptIn, setShowInfluencerOptIn] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCompletedModal, setShowCompletedModal] = useState(false);
  const [selfieFile, setSelfieFile] = useState(null);
  const [qrInput, setQrInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [error, setError] = useState("");
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  // Admin states
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminTab, setAdminTab] = useState("hunts");
  const [adminHunts, setAdminHunts] = useState([]);
  const [userUploads, setUserUploads] = useState([]);
  const [processingSubmission, setProcessingSubmission] = useState(null);
  const [editingHunt, setEditingHunt] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Create/Edit Hunt Form
  const [newHuntDate, setNewHuntDate] = useState("");
  const [newHuntCategory, setNewHuntCategory] = useState("");
  const [newHuntRiddle, setNewHuntRiddle] = useState("");
  const [newHuntBusinessName, setNewHuntBusinessName] = useState("");
  const [newHuntCode, setNewHuntCode] = useState("");
  const [newHuntDiscount, setNewHuntDiscount] = useState("");
  const [newHuntLat, setNewHuntLat] = useState("");
  const [newHuntLon, setNewHuntLon] = useState("");
  const [newHuntRadius, setNewHuntRadius] = useState("50");
  const [newHuntDuration, setNewHuntDuration] = useState("1day");
  const [newHuntPhoto, setNewHuntPhoto] = useState(null);
  const [newHuntTrim, setNewHuntTrim] = useState("none");
  const [newHuntQrCode, setNewHuntQrCode] = useState("");
  const [creatingHunt, setCreatingHunt] = useState(false);

  // ─── LOAD USER DATA ─────────────────────
  const loadProgressAndHunts = useCallback(async (currentSession) => {
    if (!currentSession?.user?.id) return;
    if (showAdmin) return;

    try {
      setError("");

      const { data: progressRows, error: progressError } = await supabase
        .from("user_progress")
        .select("*")
        .eq("user_id", currentSession.user.id)
        .order("last_active", { ascending: false });

      if (progressError) throw progressError;

      let completedIds = [];
      const progress = progressRows?.[0] || null;

      if (progress) {
        completedIds = Array.isArray(progress.completed_hunt_ids) ? progress.completed_hunt_ids : [];

        if (progressRows.length > 1) {
          const all = new Set();
          let maxTotal = 0, maxStreak = 0;
          progressRows.forEach((r) => {
            if (Array.isArray(r.completed_hunt_ids)) r.completed_hunt_ids.forEach((id) => all.add(id));
            maxTotal = Math.max(maxTotal, r.total_hunts || 0);
            maxStreak = Math.max(maxStreak, r.streak || 0);
          });
          completedIds = Array.from(all);
          setTotalHunts(completedIds.length);
          setStreak(maxStreak);
        } else {
          setTotalHunts(progress.total_hunts || 0);
          setStreak(progress.streak || 0);
        }

        setCompleted(completedIds);
        setTier(
          completedIds.length >= 20 ? "Legend" :
          completedIds.length >= 10 ? "Pro" :
          completedIds.length >= 5 ? "Hunter" : "Newbie"
        );
        setLastActive(progress.last_active || null);
      } else {
        setCompleted([]);
        setStreak(0);
        setTotalHunts(0);
        setTier("Newbie");
        setLastActive(null);
      }

      // Load influencer status
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_influencer")
        .eq("id", currentSession.user.id)
        .single();
      setIsInfluencer(profile?.is_influencer || false);

      const now = new Date().toISOString();
      const { data: huntsData, error: huntsError } = await supabase
        .from("hunts")
        .select("*")
        .gte("expiry_date", now)
        .order("date", { ascending: false });

      if (huntsError) throw huntsError;

      setHunts(huntsData || []);
    } catch (e) {
      console.error("Load error:", e);
      setError("Failed to load hunts – check connection or try refresh.");
      setHunts([]);
    } finally {
      setDataLoaded(true);
    }
  }, [showAdmin]);

  // ─── AUTH & DATA LOADING ─────────────────────
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          setSessionLoading(false);
          setDataLoaded(true);
          return;
        }

        setSession(currentSession);
        
        if (currentSession?.user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
          setIsAdmin(true);
        }
        
        if (!currentSession) {
          setDataLoaded(true);
        }
      } catch (err) {
        setSession(null);
        setDataLoaded(true);
      } finally {
        setSessionLoading(false);
      }
    };

    initAuth();

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setSessionLoading(false);

      if (session?.user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
        setShowAdmin(false);
      }

      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') && session && !showAdmin) {
        loadProgressAndHunts(session);
      }

      if (event === 'SIGNED_OUT' || !session) {
        setDataLoaded(true);
      }

      if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", session.user.id)
          .single();

        if (!profile) {
          await supabase.from("profiles").insert({
            id: session.user.id,
            username: session.user.email?.split("@")[0] || `hunter_${Date.now().toString(36)}`,
            full_name: session.user.user_metadata.full_name || null,
            is_influencer: false,
          });
        }
      }
    });

    return () => listener?.subscription.unsubscribe();
  }, [showAdmin, loadProgressAndHunts]);

  // Sorted and filtered hunts
  const sortedAndFilteredHunts = hunts
    .filter((h) => !completed.includes(h.id))
    .filter((h) => activeFilter === "All" || h.category === activeFilter)
    .filter((h) => h.trim_color !== "gold" || totalHunts >= 10)
    .sort((a, b) => {
      const order = { purple: 0, blue: 1, green: 2, none: 3, gold: 4 };
      return order[a.trim_color || "none"] - order[b.trim_color || "none"];
    });

  // Realtime updates
  useEffect(() => {
    if (!session || showAdmin) return;

    let huntsChannel, progressChannel;

    const setupRealtime = () => {
      huntsChannel = supabase
        .channel("hunts-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "hunts" }, () => {
          loadProgressAndHunts(session);
        })
        .subscribe();

      progressChannel = supabase
        .channel("progress-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "user_progress", filter: `user_id=eq.${session.user.id}` },
          () => {
            loadProgressAndHunts(session);
          }
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      supabase.removeChannel(huntsChannel);
      supabase.removeChannel(progressChannel);
    };
  }, [session, showAdmin, loadProgressAndHunts]);

  // ─── TRIM LIMIT VALIDATION ─────────────────────
  const validateTrimLimit = async (category, trim, excludeId = null) => {
    if (trim === "none" || trim === "gold") return true;

    const { data, error } = await supabase
      .from("hunts")
      .select("id")
      .eq("category", category)
      .eq("trim_color", trim);

    if (error) return false;

    const count = data.filter(h => h.id !== excludeId).length;

    const limits = { green: 5, blue: 3, purple: 1 };
    return count < limits[trim];
  };

  // ─── COMPLETION LOGIC ─────────────────────
  const completeHunt = async (newCompleted) => {
    const today = getTodayLocalDate();
    let newStreak = streak;
    if (lastActive === getYesterdayLocalDate()) newStreak = streak + 1;
    else if (lastActive !== today) newStreak = 1;

    const newTier = newCompleted.length >= 20 ? "Legend" : newCompleted.length >= 10 ? "Pro" : newCompleted.length >= 5 ? "Hunter" : "Newbie";

    await supabase.from("user_progress").upsert({
      user_id: session.user.id,
      completed_hunt_ids: newCompleted,
      total_hunts: newCompleted.length,
      streak: newStreak,
      tier: newTier,
      last_active: today,
    }, { onConflict: "user_id" });

    setCompleted(newCompleted);
    setTotalHunts(newCompleted.length);
    setStreak(newStreak);
    setTier(newTier);
    setLastActive(today);

    if (newCompleted.length === 20 && !isInfluencer) {
      setShowInfluencerOptIn(true);
    }
  };

  // ─── QR VERIFICATION ─────────────────────
  const verifyQrAndUnlock = async () => {
    if (!qrInput.trim()) {
      alert("Please enter the QR code");
      return;
    }

    setUploading(true);
    try {
      if (!navigator.geolocation) throw new Error("Geolocation not supported");

      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const distance = calculateDistance(
        position.coords.latitude,
        position.coords.longitude,
        currentHunt.lat,
        currentHunt.lon
      );

      if (distance > currentHunt.radius) {
        alert(`You are ${Math.round(distance)}m away – get closer!`);
        setUploading(false);
        return;
      }

      if (qrInput.trim().toUpperCase() !== (currentHunt.qr_code || "").trim().toUpperCase()) {
        alert("Incorrect QR code");
        setUploading(false);
        return;
      }

      const newCompleted = [...new Set([...completed, currentHunt.id])];
      await completeHunt(newCompleted);

      setShowVerificationModal(false);
      setQrInput("");
      alert(`Success! Your discount code is: ${currentHunt.code}`);
    } catch (err) {
      alert("Location access needed – please allow it");
    } finally {
      setUploading(false);
    }
  };

  // ─── SELFIE UPLOAD ─────────────────────
  const uploadSelfie = useCallback(async () => {
    if (!selfieFile || !currentHunt || uploading) return;

    setUploading(true);
    try {
      if (!navigator.geolocation) throw new Error("Geolocation not supported");

      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const distance = calculateDistance(
        position.coords.latitude,
        position.coords.longitude,
        currentHunt.lat,
        currentHunt.lon
      );

      if (distance > currentHunt.radius) {
        alert(`Too far – you need to be within ${currentHunt.radius}m`);
        setUploading(false);
        return;
      }

      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(selfieFile.type)) {
        throw new Error('Please upload JPG, PNG or WebP');
      }

      if (selfieFile.size > 5 * 1024 * 1024) {
        throw new Error('File too large (max 5MB)');
      }

      const fileExt = selfieFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `${session.user.id}/${currentHunt.id}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("user-uploads")
        .upload(filePath, selfieFile, { upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("user-uploads")
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase.from("user-uploads").insert({
        user_id: session.user.id,
        hunt_id: currentHunt.id,
        image_url: publicUrl,
      });

      if (insertError) throw insertError;

      const newCompleted = [...new Set([...completed, currentHunt.id])];
      await completeHunt(newCompleted);

      setShowVerificationModal(false);
      setSelfieFile(null);
      alert(`Selfie submitted! Your code: ${currentHunt.code}`);
    } catch (err) {
      alert(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [selfieFile, currentHunt, uploading, session, completed]);

  // ─── ADMIN DATA ─────────────────────
  const loadAdminData = useCallback(async () => {
    try {
      const { data: allHunts } = await supabase
        .from("hunts")
        .select("*")
        .order("date", { ascending: false });
      setAdminHunts(allHunts || []);

      const { data: subs } = await supabase
        .from("user-uploads")
        .select("*")
        .order("created_at", { ascending: false });

      const enriched = await Promise.all(
        (subs || []).map(async (sub) => {
          const { data: hunt } = await supabase
            .from("hunts")
            .select("business_name")
            .eq("id", sub.hunt_id)
            .single();
          return { ...sub, hunt_name: hunt?.business_name || "Unknown" };
        })
      );
      setUserUploads(enriched);
    } catch (e) {
      setError("Failed to load admin data");
    }
  }, []);

  useEffect(() => {
    if (showAdmin && isAdmin) loadAdminData();
  }, [showAdmin, isAdmin, loadAdminData]);

  // ─── CREATE HUNT ─────────────────────
  const createHunt = useCallback(async () => {
    if (!newHuntBusinessName.trim() || !newHuntRiddle.trim() || !newHuntCode.trim() || !newHuntLat || !newHuntLon) {
      alert("Please fill all required fields");
      return;
    }

    const lat = parseFloat(newHuntLat);
    const lon = parseFloat(newHuntLon);
    if (isNaN(lat) || isNaN(lon)) {
      alert("Invalid coordinates");
      return;
    }

    const canAdd = await validateTrimLimit(newHuntCategory || "Food & Drink", newHuntTrim);
    if (!canAdd) {
      alert(`Cannot add more ${newHuntTrim} trimmed hunts in this category`);
      return;
    }

    setCreatingHunt(true);
    try {
      let photoUrl = null;

      if (newHuntPhoto) {
        const fileExt = newHuntPhoto.name.split(".").pop()?.toLowerCase() || "jpg";
        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("hunts")
          .upload(fileName, newHuntPhoto, { cacheControl: "3600", upsert: false });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from("hunts").getPublicUrl(fileName);
        photoUrl = data.publicUrl;
      }

      const startDate = newHuntDate || getTodayLocalDate();
      const expiryDate = calculateExpiryDate(startDate, newHuntDuration);

      const { error } = await supabase.from("hunts").insert({
        date: startDate,
        expiry_date: expiryDate,
        duration: newHuntDuration,
        category: newHuntCategory || "Food & Drink",
        riddle: newHuntRiddle.trim(),
        business_name: newHuntBusinessName.trim(),
        code: newHuntCode.trim(),
        discount: newHuntDiscount.trim(),
        photo: photoUrl,
        lat,
        lon,
        radius: parseInt(newHuntRadius) || 50,
        trim_color: newHuntTrim,
        qr_code: newHuntQrCode.trim() || null,
      });

      if (error) throw error;

      alert("Hunt created successfully!");
      setNewHuntDate("");
      setNewHuntCategory("");
      setNewHuntRiddle("");
      setNewHuntBusinessName("");
      setNewHuntCode("");
      setNewHuntDiscount("");
      setNewHuntLat("");
      setNewHuntLon("");
      setNewHuntRadius("50");
      setNewHuntDuration("1day");
      setNewHuntTrim("none");
      setNewHuntPhoto(null);
      setNewHuntQrCode("");
      loadAdminData();
      setAdminTab("hunts");
    } catch (err) {
      alert("Failed to create hunt: " + (err.message || "Unknown error"));
    } finally {
      setCreatingHunt(false);
    }
  }, [
    newHuntDate, newHuntCategory, newHuntRiddle, newHuntBusinessName,
    newHuntCode, newHuntDiscount, newHuntLat, newHuntLon, newHuntRadius,
    newHuntDuration, newHuntPhoto, newHuntTrim, newHuntQrCode, loadAdminData
  ]);

  // ─── ADMIN APPROVE / REJECT ─────────────────────
  const approveSelfie = useCallback(async (id) => {
    setProcessingSubmission(id);
    try {
      const { error } = await supabase.from("user-uploads").update({ approved: true }).eq("id", id);
      if (error) throw error;
      await loadAdminData();
    } catch {
      alert("Failed to approve");
    } finally {
      setProcessingSubmission(null);
    }
  }, [loadAdminData]);

  const rejectSelfie = useCallback(async (id) => {
    if (!window.confirm("Reject this submission?")) return;
    setProcessingSubmission(id);
    try {
      const { error } = await supabase.from("user-uploads").delete().eq("id", id);
      if (error) throw error;
      await loadAdminData();
    } catch {
      alert("Failed to reject");
    } finally {
      setProcessingSubmission(null);
    }
  }, [loadAdminData]);

  // ─── EDIT HUNT ─────────────────────
  const startEditHunt = useCallback((hunt) => {
    setEditingHunt(hunt);
    setNewHuntDate(hunt.date || "");
    setNewHuntCategory(hunt.category || "");
    setNewHuntRiddle(hunt.riddle || "");
    setNewHuntBusinessName(hunt.business_name || "");
    setNewHuntCode(hunt.code || "");
    setNewHuntDiscount(hunt.discount || "");
    setNewHuntLat(hunt.lat?.toString() || "");
    setNewHuntLon(hunt.lon?.toString() || "");
    setNewHuntRadius(hunt.radius?.toString() || "50");
    setNewHuntDuration(hunt.duration || "1day");
    setNewHuntTrim(hunt.trim_color || "none");
    setNewHuntQrCode(hunt.qr_code || "");
    setNewHuntPhoto(null);
    setShowEditModal(true);
  }, []);

  const updateHunt = useCallback(async () => {
    if (!editingHunt) return;
    if (!newHuntBusinessName.trim() || !newHuntRiddle.trim() || !newHuntCode.trim() || !newHuntLat || !newHuntLon) {
      alert("Please fill all required fields");
      return;
    }

    const lat = parseFloat(newHuntLat);
    const lon = parseFloat(newHuntLon);
    if (isNaN(lat) || isNaN(lon)) {
      alert("Invalid coordinates");
      return;
    }

    const canAdd = await validateTrimLimit(newHuntCategory || "Food & Drink", newHuntTrim, editingHunt.id);
    if (!canAdd) {
      alert(`Cannot have more than the limit of ${newHuntTrim} trimmed hunts in this category`);
      return;
    }

    setCreatingHunt(true);
    try {
      let photoUrl = editingHunt.photo;

      if (newHuntPhoto) {
        const fileExt = newHuntPhoto.name.split(".").pop()?.toLowerCase() || "jpg";
        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("hunts")
          .upload(fileName, newHuntPhoto, { cacheControl: "3600", upsert: false });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from("hunts").getPublicUrl(fileName);
        photoUrl = data.publicUrl;
      }

      const startDate = newHuntDate || getTodayLocalDate();
      const expiryDate = calculateExpiryDate(startDate, newHuntDuration);

      const { error } = await supabase.from("hunts").update({
        date: startDate,
        expiry_date: expiryDate,
        duration: newHuntDuration,
        category: newHuntCategory || "Food & Drink",
        riddle: newHuntRiddle.trim(),
        business_name: newHuntBusinessName.trim(),
        code: newHuntCode.trim(),
        discount: newHuntDiscount.trim(),
        photo: photoUrl,
        lat,
        lon,
        radius: parseInt(newHuntRadius) || 50,
        trim_color: newHuntTrim,
        qr_code: newHuntQrCode.trim() || null,
      }).eq("id", editingHunt.id);

      if (error) throw error;

      alert("Hunt updated successfully!");
      setShowEditModal(false);
      setEditingHunt(null);
      setNewHuntDate("");
      setNewHuntCategory("");
      setNewHuntRiddle("");
      setNewHuntBusinessName("");
      setNewHuntCode("");
      setNewHuntDiscount("");
      setNewHuntLat("");
      setNewHuntLon("");
      setNewHuntRadius("50");
      setNewHuntDuration("1day");
      setNewHuntTrim("none");
      setNewHuntPhoto(null);
      setNewHuntQrCode("");
      loadAdminData();
    } catch (err) {
      alert("Failed to update hunt: " + (err.message || "Unknown error"));
    } finally {
      setCreatingHunt(false);
    }
  }, [
    editingHunt, newHuntDate, newHuntCategory, newHuntRiddle, newHuntBusinessName,
    newHuntCode, newHuntDiscount, newHuntLat, newHuntLon, newHuntRadius,
    newHuntDuration, newHuntPhoto, newHuntTrim, newHuntQrCode, loadAdminData
  ]);

  const deleteHunt = useCallback(async (id) => {
    if (!window.confirm("Are you sure you want to delete this hunt? This cannot be undone.")) return;

    try {
      const { error } = await supabase.from("hunts").delete().eq("id", id);
      if (error) throw error;
      alert("Hunt deleted successfully!");
      loadAdminData();
    } catch (err) {
      alert("Failed to delete hunt: " + (err.message || "Unknown error"));
    }
  }, [loadAdminData]);

  // ─── AUTH ─────────────────────
  const signUp = async () => {
    if (!email.trim() || !password) {
      setAuthError("Please enter email and password");
      return;
    }
    setLoading(true);
    setAuthError("");
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      alert("Check your email to confirm!");
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async () => {
    if (!email.trim() || !password) {
      setAuthError("Please enter email and password");
      return;
    }
    setLoading(true);
    setAuthError("");
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    if (!window.confirm("Sign out?")) return;
    await supabase.auth.signOut();
    setSession(null);
  };

  const activeHuntsCount = hunts.filter((h) => !completed.includes(h.id)).length;
  const completedHunts = hunts.filter((h) => completed.includes(h.id));

  // ─── RENDER ADMIN PANEL ─────────────────────
  if (showAdmin && isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="bg-white shadow-xl p-4 md:p-6 sticky top-0 z-50 flex justify-between items-center">
          <h1 className="text-2xl md:text-4xl font-black text-amber-900 flex items-center gap-2 md:gap-4">
            <Shield className="w-8 h-8 md:w-12 md:h-12" />
            Admin Panel
          </h1>
          <div className="flex gap-2 md:gap-4">
            <button onClick={() => setShowAdmin(false)} className="px-4 md:px-6 py-2 md:py-3 bg-gray-200 hover:bg-gray-300 rounded-full font-bold text-sm md:text-base">
              Back
            </button>
            <button onClick={signOut} className="text-gray-600 hover:text-gray-800 flex items-center gap-2">
              <LogOut size={20} />
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-4 md:p-8">
          <div className="flex gap-4 md:gap-8 mb-8 md:mb-12 border-b-4 border-amber-200 overflow-x-auto">
            <button
              onClick={() => setAdminTab("hunts")}
              className={`pb-4 px-4 md:px-6 text-lg md:text-2xl font-bold whitespace-nowrap ${adminTab === "hunts" ? "text-amber-600 border-b-4 border-amber-600" : "text-gray-600"}`}
            >
              All Hunts ({adminHunts.length})
            </button>
            <button
              onClick={() => setAdminTab("selfies")}
              className={`pb-4 px-4 md:px-6 text-lg md:text-2xl font-bold whitespace-nowrap ${adminTab === "selfies" ? "text-amber-600 border-b-4 border-amber-600" : "text-gray-600"}`}
            >
              Pending ({userUploads.filter((s) => !s.approved).length})
            </button>
            <button
              onClick={() => setAdminTab("create")}
              className={`pb-4 px-4 md:px-6 text-lg md:text-2xl font-bold whitespace-nowrap ${adminTab === "create" ? "text-amber-600 border-b-4 border-amber-600" : "text-gray-600"}`}
            >
              + Create Hunt
            </button>
          </div>

          {adminTab === "hunts" && (
            <div className="grid gap-4 md:gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {adminHunts.map((hunt) => (
                <div key={hunt.id} className="bg-white rounded-3xl shadow-2xl overflow-hidden">
                  <img src={getSafePhotoUrl(hunt.photo)} alt={hunt.business_name} className="w-full h-48 md:h-64 object-cover" />
                  <div className="p-4 md:p-6">
                    <span className="inline-block px-3 md:px-4 py-1 bg-amber-200 text-amber-800 rounded-full text-xs font-bold mb-3">
                      {hunt.category}
                    </span>
                    <h3 className="text-xl md:text-2xl font-black text-amber-900 mb-2">{hunt.business_name}</h3>
                    <p className="text-sm md:text-base text-gray-600 italic mb-4">"{hunt.riddle}"</p>
                    <p className="text-xs md:text-sm"><strong>Code:</strong> {hunt.code}</p>
                    <p className="text-xs md:text-sm"><strong>QR:</strong> {hunt.qr_code || "None"}</p>
                    <p className="text-xs md:text-sm"><strong>Date:</strong> {new Date(hunt.date).toLocaleDateString()}</p>
                    <p className="text-xs md:text-sm mb-4"><strong>Trim:</strong> {hunt.trim_color || "none"}</p>
                    <div className="flex gap-2 md:gap-3">
                      <button onClick={() => startEditHunt(hunt)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 md:py-3 rounded-xl font-bold">
                        Edit
                      </button>
                      <button onClick={() => deleteHunt(hunt.id)} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 md:py-3 rounded-xl font-bold">
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {adminTab === "selfies" && (
            <div>
              {userUploads.filter(s => !s.approved).length === 0 ? (
                <p className="text-center text-xl py-12">No pending selfies</p>
              ) : (
                userUploads.filter(s => !s.approved).map(sub => (
                  <div key={sub.id} className="bg-white rounded-3xl shadow-2xl flex flex-col lg:flex-row mb-8">
                    <img src={sub.image_url} alt="Selfie" className="w-full lg:w-96 h-64 object-cover" />
                    <div className="p-8 flex-1 flex flex-col justify-center">
                      <p className="text-xl mb-2"><strong>User:</strong> {sub.user_id.slice(0,8)}...</p>
                      <p className="text-xl mb-6"><strong>Hunt:</strong> {sub.hunt_name}</p>
                      <div className="flex gap-4">
                        <button onClick={() => approveSelfie(sub.id)} disabled={processingSubmission === sub.id} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl font-bold">
                          Approve
                        </button>
                        <button onClick={() => rejectSelfie(sub.id)} disabled={processingSubmission === sub.id} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-bold">
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {adminTab === "create" && (
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-4xl mx-auto">
              <h2 className="text-4xl font-black text-amber-900 text-center mb-10">Create New Hunt</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Active From Date</label>
                  <input type="date" value={newHuntDate} onChange={(e) => setNewHuntDate(e.target.value)} className="w-full p-4 border-2 border-amber-200 rounded-2xl" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Duration</label>
                  <select value={newHuntDuration} onChange={(e) => setNewHuntDuration(e.target.value)} className="w-full p-4 border-2 border-amber-200 rounded-2xl">
                    <option value="1hour">1 hour</option>
                    <option value="3hours">3 hours</option>
                    <option value="12hours">12 hours</option>
                    <option value="1day">1 day</option>
                    <option value="3days">3 days</option>
                    <option value="1week">1 week</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
                  <select value={newHuntCategory} onChange={(e) => setNewHuntCategory(e.target.value)} className="w-full p-4 border-2 border-amber-200 rounded-2xl">
                    <option value="">Select category</option>
                    <option>Café</option>
                    <option>Barber</option>
                    <option>Restaurant</option>
                    <option>Gig</option>
                    <option>Museum</option>
                    <option>Food & Drink</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Business Name *</label>
                  <input type="text" value={newHuntBusinessName} onChange={(e) => setNewHuntBusinessName(e.target.value)} className="w-full p-4 border-2 border-amber-200 rounded-2xl" placeholder="e.g. Brew Coffee House" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Riddle / Clue *</label>
                  <textarea value={newHuntRiddle} onChange={(e) => setNewHuntRiddle(e.target.value)} className="w-full p-4 border-2 border-amber-200 rounded-2xl h-32" placeholder="Write an intriguing riddle..." />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Secret Code *</label>
                  <input type="text" value={newHuntCode} onChange={(e) => setNewHuntCode(e.target.value)} className="w-full p-4 border-2 border-amber-200 rounded-2xl" placeholder="e.g. BREW2025" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">QR Code (optional)</label>
                  <input type="text" value={newHuntQrCode} onChange={(e) => setNewHuntQrCode(e.target.value)} className="w-full p-4 border-2 border-amber-200 rounded-2xl" placeholder="e.g. BREW2025-QR" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Discount / Reward</label>
                  <input type="text" value={newHuntDiscount} onChange={(e) => setNewHuntDiscount(e.target.value)} className="w-full p-4 border-2 border-amber-200 rounded-2xl" placeholder="e.g. Free coffee" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Latitude *</label>
                  <input type="text" value={newHuntLat} onChange={(e) => setNewHuntLat(e.target.value)} className="w-full p-4 border-2 border-amber-200 rounded-2xl" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Longitude *</label>
                  <input type="text" value={newHuntLon} onChange={(e) => setNewHuntLon(e.target.value)} className="w-full p-4 border-2 border-amber-200 rounded-2xl" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Radius (m)</label>
                  <input type="number" value={newHuntRadius} onChange={(e) => setNewHuntRadius(e.target.value)} className="w-full p-4 border-2 border-amber-200 rounded-2xl" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Card Trim</label>
                  <select value={newHuntTrim} onChange={(e) => setNewHuntTrim(e.target.value)} className="w-full p-4 border-2 border-amber-200 rounded-2xl">
                    <option value="none">No Trim</option>
                    <option value="green">Green</option>
                    <option value="blue">Blue</option>
                    <option value="purple">Purple</option>
                    <option value="gold">Gold (Pro+ only)</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Hunt Photo</label>
                  <input type="file" accept="image/*" onChange={(e) => setNewHuntPhoto(e.target.files?.[0] || null)} className="w-full p-4 border-2 border-dashed border-amber-300 rounded-2xl bg-amber-50" />
                </div>
              </div>
              <button onClick={createHunt} disabled={creatingHunt} className="mt-10 w-full bg-amber-600 hover:bg-amber-700 text-white py-6 rounded-2xl font-black text-2xl">
                {creatingHunt ? "Creating..." : "Create Hunt"}
              </button>
            </div>
          )}

          {/* Edit Modal – same form as create */}
          {showEditModal && editingHunt && (
            <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 overflow-y-auto">
              <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-4xl w-full">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-4xl font-black text-amber-900">Edit Hunt</h2>
                  <button onClick={() => { setShowEditModal(false); setEditingHunt(null); setNewHuntPhoto(null); }} className="text-4xl text-gray-500">
                    ×
                  </button>
                </div>
                {/* Same form as create, pre-filled */}
                {/* Copy the create form grid above here with values set */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* ... all fields ... */}
                </div>
                <div className="flex gap-4 mt-10">
                  <button onClick={() => { setShowEditModal(false); setEditingHunt(null); setNewHuntPhoto(null); }} className="flex-1 bg-gray-300 py-5 rounded-2xl font-bold">
                    Cancel
                  </button>
                  <button onClick={updateHunt} disabled={creatingHunt} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-5 rounded-2xl font-black">
                    Update Hunt
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── LOGIN SCREEN ─────────────────────
  if (sessionLoading || !session) {
    if (sessionLoading) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-purple-900 to-indigo-900 flex items-center justify-center">
          <p className="text-2xl font-bold text-white">Loading...</p>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-12 max-w-md w-full text-center border border-white/20">
          <h1 className="text-6xl font-black text-white mb-4">Brew Hunt</h1>
          <p className="text-xl text-white/80 mb-12">Real-world treasure hunts</p>
          {authError && <p className="text-pink-300 mb-6">{authError}</p>}
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-5 mb-4 bg-white/20 border border-white/30 rounded-2xl text-white placeholder-white/60" />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-5 mb-8 bg-white/20 border border-white/30 rounded-2xl text-white placeholder-white/60" />
          <button onClick={signUp} disabled={loading} className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-6 rounded-2xl font-bold text-2xl mb-4 shadow-lg">
            Sign Up
          </button>
          <button onClick={signIn} disabled={loading} className="w-full bg-white/20 hover:bg-white/30 text-white py-6 rounded-2xl font-bold text-2xl backdrop-blur">
            Log In
          </button>
        </div>
      </div>
    );
  }

  if (!dataLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 to-indigo-900 flex items-center justify-center">
        <p className="text-2xl font-bold text-white">Loading your hunts...</p>
      </div>
    );
  }

  // ─── MAIN DASHBOARD ─────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-purple-800 to-indigo-900 pb-32">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-xl sticky top-0 z-40 p-4 border-b border-white/20">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-black text-white">Brew Hunt</h1>
          <div className="flex items-center gap-4">
            {isAdmin && (
              <button onClick={() => setShowAdmin(true)} className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-full font-bold flex items-center gap-2 backdrop-blur">
                <Shield className="w-5 h-5" /> Admin
              </button>
            )}
            <button onClick={() => setShowProfileModal(true)} className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-3 rounded-full shadow-lg">
              <User className="w-6 h-6" />
            </button>
            <button onClick={signOut} className="text-white/80">
              <LogOut className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="flex flex-wrap gap-3 justify-center mb-8">
          {["All", "Café", "Barber", "Restaurant", "Gig", "Museum"].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={`px-6 py-3 rounded-full font-bold text-sm transition backdrop-blur-xl border border-white/30 ${
                activeFilter === cat ? "bg-white/30 text-white" : "bg-white/10 text-white/80 hover:bg-white/20"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Hunt Cards – Glassmorphic */}
        <div className="grid grid-cols-2 gap-4 max-w-5xl mx-auto">
          {sortedAndFilteredHunts.length === 0 ? (
            <div className="col-span-2 text-center py-16">
              <p className="text-xl text-white/80">No active hunts right now</p>
            </div>
          ) : (
            sortedAndFilteredHunts.map((hunt) => (
              <div
                key={hunt.id}
                className={`bg-white/10 backdrop-blur-xl rounded-3xl overflow-hidden flex flex-col h-96 border border-white/20 shadow-2xl ${getTrimClass(hunt.trim_color)}`}
              >
                {/* Clickable area */}
                <div
                  onClick={() => {
                    setCurrentHunt(hunt);
                    setShowDetailModal(true);
                  }}
                  className="flex-1 flex flex-col cursor-pointer"
                >
                  <div className="relative">
                    <img
                      src={getSafePhotoUrl(hunt.photo)}
                      alt={hunt.business_name}
                      className="w-full h-44 object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between text-white">
                    <div>
                      <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur rounded-full text-xs font-bold mb-2">
                        {hunt.category}
                      </span>
                      <p className="text-base font-bold line-clamp-2 mb-1">{hunt.riddle}</p>
                      <p className="text-lg font-black line-clamp-2">{hunt.business_name}</p>
                    </div>
                    {hunt.discount && (
                      <p className="text-sm font-bold text-pink-300 mt-2">Unlock: {hunt.discount}</p>
                    )}
                  </div>
                </div>

                {/* Action button */}
                <div className="p-4 pt-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentHunt(hunt);
                      setShowVerificationModal(true);
                    }}
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl"
                  >
                    I'm at the spot!
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && currentHunt && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-white/30 relative">
            <button
              onClick={() => setShowDetailModal(false)}
              className="absolute top-4 right-4 text-4xl text-white/80 z-10"
            >
              ×
            </button>
            <img
              src={getSafePhotoUrl(currentHunt.photo)}
              alt={currentHunt.business_name}
              className="w-full h-64 object-cover rounded-t-3xl opacity-90"
            />
            <div className="p-8 text-white">
              <span className="inline-block px-4 py-2 bg-white/20 backdrop-blur rounded-full text-sm font-bold mb-4">
                {currentHunt.category}
              </span>
              <h2 className="text-3xl font-black mb-4">{currentHunt.business_name}</h2>
              <p className="text-xl italic mb-6">"{currentHunt.riddle}"</p>
              {currentHunt.discount && (
                <p className="text-2xl font-bold text-pink-300">{currentHunt.discount}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Verification Modal */}
      {showVerificationModal && currentHunt && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl max-w-md w-full p-8 relative border border-white/30">
            <button
              onClick={() => {
                setShowVerificationModal(false);
                setQrInput("");
                setSelfieFile(null);
              }}
              className="absolute top-4 right-4 text-4xl text-white/80"
            >
              ×
            </button>

            <h2 className="text-3xl font-black text-white text-center mb-3">{currentHunt.business_name}</h2>
            {currentHunt.discount && (
              <p className="text-2xl font-bold text-pink-300 text-center mb-6">{currentHunt.discount}</p>
            )}

            <div className="mb-10">
              <p className="text-center text-lg font-semibold text-white/90 mb-4">Scan the QR code at the venue</p>
              <div className="flex items-center gap-3 bg-white/20 backdrop-blur rounded-2xl p-4 mb-4 border border-white/30">
                <QrCode className="w-10 h-10 text-pink-300" />
                <input
                  type="text"
                  placeholder="Enter code here"
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  className="flex-1 text-lg bg-transparent text-white placeholder-white/60 outline-none"
                />
              </div>
              <button
                onClick={verifyQrAndUnlock}
                disabled={uploading || !qrInput.trim()}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 disabled:opacity-60 text-white py-5 rounded-2xl font-black text-xl shadow-xl"
              >
                {uploading ? "Verifying..." : "Verify QR & Unlock Code"}
              </button>
            </div>

            <div className="text-center">
              <p className="text-white/80 mb-4">— or submit a selfie as backup —</p>
              {selfieFile && <p className="text-pink-300 font-bold mb-4">Selected: {selfieFile.name}</p>}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => setSelfieFile(e.target.files?.[0] || null)}
                className="hidden"
                id="selfie-backup"
              />
              <label
                htmlFor="selfie-backup"
                className="inline-block w-32 h-32 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center cursor-pointer mb-6 shadow-2xl"
              >
                <Camera className="w-16 h-16 text-white" />
              </label>
              <button
                onClick={uploadSelfie}
                disabled={!selfieFile || uploading}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 disabled:opacity-60 text-white py-5 rounded-2xl font-black text-xl shadow-xl"
              >
                Submit Selfie Backup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Influencer Opt-In Modal */}
      {showInfluencerOptIn && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl p-8 max-w-md w-full text-center border border-white/30">
            <h2 className="text-3xl font-black text-white mb-6">Legend Status Unlocked!</h2>
            <p className="text-lg text-white/90 mb-8">Join our influencer network for exclusive gold hunts & rewards?</p>
            <div className="flex gap-4">
              <button onClick={() => setShowInfluencerOptIn(false)} className="flex-1 bg-white/20 hover:bg-white/30 py-5 rounded-2xl font-bold text-white">
                Later
              </button>
              <button
                onClick={async () => {
                  await supabase.from("profiles").update({ is_influencer: true }).eq("id", session.user.id);
                  setIsInfluencer(true);
                  setShowInfluencerOptIn(false);
                }}
                className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white py-5 rounded-2xl font-bold"
              >
                Yes!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center relative border border-white/30">
            <button onClick={() => setShowProfileModal(false)} className="absolute top-4 right-4 text-4xl text-white/80">
              ×
            </button>
            <User className="w-16 h-16 text-pink-300 mx-auto mb-6" />
            <h2 className="text-4xl font-black text-white mb-8">Your Profile</h2>
            <div className="bg-white/10 backdrop-blur rounded-3xl p-8 mb-8 border border-white/20">
              <div className="text-5xl font-black text-pink-300 mb-2">{streak}</div>
              <p className="text-white/80 mb-8">day streak</p>
              <div className="text-3xl font-black text-purple-300 mb-2">{tier}</div>
              <p className="text-white/80">tier</p>
            </div>
            <button onClick={() => setShowCompletedModal(true)} className="text-xl text-white underline font-bold">
              {totalHunts} completed hunts
            </button>
          </div>
        </div>
      )}

      {/* Completed Hunts Modal */}
      {showCompletedModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto relative border border-white/30">
            <button onClick={() => setShowCompletedModal(false)} className="absolute top-4 right-4 text-4xl text-white/80">
              ×
            </button>
            <h2 className="text-3xl font-black text-white text-center mb-8">Completed Hunts ({totalHunts})</h2>
            {completedHunts.length === 0 ? (
              <p className="text-center text-white/80">No completed hunts yet</p>
            ) : (
              <div className="space-y-6">
                {completedHunts.map(hunt => (
                  <div key={hunt.id} className="bg-white/10 backdrop-blur rounded-3xl p-6 border border-white/20">
                    <img src={getSafePhotoUrl(hunt.photo)} alt="" className="w-full h-48 object-cover rounded-2xl mb-4 opacity-90" />
                    <p className="font-bold text-xl text-white">{hunt.business_name}</p>
                    <p className="text-white/80 italic mb-4">"{hunt.riddle}"</p>
                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-4">
                      <p className="text-white font-bold">Your code:</p>
                      <p className="text-2xl font-black">{hunt.code}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
