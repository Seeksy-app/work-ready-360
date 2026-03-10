
-- Create security definer function to check admin role without recursion
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND role = 'admin'
  )
$$;

-- Drop the recursive admin policy on profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Recreate using the security definer function
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO public
USING (public.is_admin(auth.uid()));
