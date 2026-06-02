-- Recursive Downline Tree Traversal Function V2
-- Supports infinite width/depth and depth-gated queries.

CREATE OR REPLACE FUNCTION public.get_downline_network(root_id UUID, max_depth INT DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  promotion_level INT,
  upline_id UUID,
  level_depth INT,
  is_active BOOLEAN,
  direct_sales_count INT,
  group_sales_count INT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE downline_tree AS (
      -- Anchor member: root agent (depth 0)
      SELECT 
          p.id,
          p.name,
          p.email,
          p.promotion_level,
          p.upline_id,
          0 AS depth,
          p.is_active,
          p.direct_sales_count,
          p.group_sales_count,
          p.created_at
      FROM public.profiles p
      WHERE p.id = root_id
      
      UNION ALL
      
      -- Recursive members: child nodes (depth + 1)
      SELECT 
          c.id,
          c.name,
          c.email,
          c.promotion_level,
          c.upline_id,
          dt.depth + 1 AS depth,
          c.is_active,
          c.direct_sales_count,
          c.group_sales_count,
          c.created_at
      FROM public.profiles c
      INNER JOIN downline_tree dt ON c.upline_id = dt.id
      WHERE max_depth IS NULL OR dt.depth < max_depth
  )
  SELECT dt.id, dt.name, dt.email, dt.promotion_level, dt.upline_id, dt.depth, dt.is_active, dt.direct_sales_count, dt.group_sales_count, dt.created_at
  FROM downline_tree dt;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
