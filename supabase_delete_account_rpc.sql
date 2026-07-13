-- Function to securely delete the currently authenticated user's account
-- This must be run in the Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to bypass RLS and delete from auth.users
SET search_path = public
AS $$
DECLARE
  uid UUID;
BEGIN
  -- Get the ID of the user making the request
  uid := auth.uid();
  
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete the user from the auth schema.
  -- Supabase's ON DELETE CASCADE will automatically handle the user_profiles, 
  -- keywords, and content_generations tables if foreign keys are set up correctly.
  DELETE FROM auth.users WHERE id = uid;
  
END;
$$;

-- Grant permission to authenticated users to execute this function
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
