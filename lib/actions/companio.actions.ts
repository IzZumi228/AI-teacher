"use server";

import { CreateCompanion, GetAllCompanions } from "@/types";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseClient } from "../supabase";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export const createCompanion = async (formData: CreateCompanion) => {
    const { userId: author } = await auth();
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
        .from("companions")
        .insert({ ...formData, author })
        .select()

    if (error || !data) {
        throw new Error(error.message || "Failed to create a companion")
    }

    return data[0];
}

export const getAllCompanions = async ({ limit = 10, page = 1, subject, topic }: GetAllCompanions) => {
    const { userId } = await auth();

    if (!userId) {
        redirect("/sign-in");
    }

    const supabase = createSupabaseClient();

    let query = supabase
        .from("companions")
        .select()
        .eq("author", userId)
        .order("created_at", { ascending: false });

    if (subject && topic) {
        query = query
            .ilike("subject", `%${subject}%`)
            .or(`topic.ilike.%${topic}%, name.ilike.%${topic}%`);
    } else if (subject) {
        query = query.ilike("subject", `%${subject}%`);
    } else if (topic) {
        query = query.or(`topic.ilike.%${topic}%, name.ilike.%${topic}%`);
    }

    query = query.range((page - 1) * limit, page * limit - 1);

    const { data: companions, error } = await query;

    if (error) {
        throw new Error(error.message || "Failed to fetch companions");
    }

    return companions;
};


export const getCompanion = async (id: string) => {
    const supabase = createSupabaseClient();

    const { data, error } = await supabase
        .from('companions')
        .select()
        .eq('id', id);

    if (error) return console.log(error);

    return data[0];
}

export const addToSessionHistory = async (companionId: string) => {
    const { userId } = await auth();
    const supabase = createSupabaseClient();
    const { data, error } = await supabase.from('session_history')
        .insert({
            companion_id: companionId,
            user_id: userId,
        })

    if (error) throw new Error(error.message);

    return data;
}

export const getRecentSessions = async (limit = 10) => {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
        .from('session_history')
        .select(`companions:companion_id (*)`)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error) throw new Error(error.message);

    return data.map(({ companions }) => companions);
}

export const getUserSessions = async (userId: string, limit = 10) => {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
        .from('session_history')
        .select(`companions:companion_id (*)`)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error) throw new Error(error.message);

    return data.map(({ companions }) => companions);
}


export const getUserCompanions = async (userId: string) => {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
        .from('companions')
        .select()
        .eq('author', userId)

    if (error) throw new Error(error.message);

    return data;
}

export const newCompanionPermissions = async () => {
    const { userId, has } = await auth();
    const supabase = createSupabaseClient();

    let limit = 0;


    if (has({ plan: 'pro_companion' })) {
        return true;
    } else if (has({ feature: "3_active_companions" })) {
        limit = 3;
    } else if (has({ feature: "10_active_companions" })) {
        limit = 10;
    }

    const { data, error } = await supabase
        .from('companions')
        .select('id', { count: 'exact' })
        .eq('author', userId)

    if (error) throw new Error(error.message);

    const companionCount = data?.length;

    if (companionCount >= limit) {
        return false
    } else {
        return true;
    }
}

// Bookmarks
export const addBookmark = async (companionId: string, path: string) => {
    const { userId } = await auth();
    if (!userId) return;
    const supabase = createSupabaseClient();
    const { data, error } = await supabase.from("bookmarks").insert({
        companion_id: companionId,
        user_id: userId,
    });
    if (error) {
        throw new Error(error.message);
    }

    // Update the bookmarked column in companions table
    const { error: updateError } = await supabase
        .from("companions")
        .update({ bookmarked: true })
        .eq("id", companionId);

    if (updateError) {
        throw new Error(updateError.message);
    }

    // Revalidate the path to force a re-render of the page
    revalidatePath(path);
    return data;
};

export const removeBookmark = async (companionId: string, path: string) => {
    const { userId } = await auth();
    if (!userId) return;
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
        .from("bookmarks")
        .delete()
        .eq("companion_id", companionId)
        .eq("user_id", userId);
    if (error) {
        throw new Error(error.message);
    }

    // Update the bookmarked column in companions table
    const { error: updateError } = await supabase
        .from("companions")
        .update({ bookmarked: false })
        .eq("id", companionId);

    if (updateError) {
        throw new Error(updateError.message);
    }

    revalidatePath(path);
    return data;
};

// It's almost the same as getUserCompanions, but it's for the bookmarked companions
export const getBookmarkedCompanions = async (userId: string) => {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
        .from("bookmarks")
        .select(`companions:companion_id (*)`) // Notice the (*) to get all the companion data
        .eq("user_id", userId);
    if (error) {
        throw new Error(error.message);
    }
    // We don't need the bookmarks data, so we return only the companions
    return data.map(({ companions }) => companions);
};

export const createFromTemplate = async (name: string, subject: string, topic: string,  duration: number, bookmarked?: boolean) => {
    const { userId: author } = await auth();
    const supabase = createSupabaseClient();

    let voice = "male"
    let style = "casual"

    if (subject === "science") {
        voice = "female"
        style = "casual"
    }

    if (subject === "history") {
        style = "formal"
    } 

    const { data, error } = await supabase
        .from("companions")
        .insert({    
            name: name,
            subject: subject,
            topic: topic,
            style: style,
            voice: voice,
            duration: duration,
            bookmarked: bookmarked || false ,
            author: author
        })
        .select();

    if (error || !data) {
        throw new Error(error.message || "Failed to create a companion");
    }

    redirect(`/companions/${data[0].id}`)
}