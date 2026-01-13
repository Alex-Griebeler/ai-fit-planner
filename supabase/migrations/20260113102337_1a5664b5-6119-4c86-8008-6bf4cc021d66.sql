-- Reset rate limit for the user to allow new tests
DELETE FROM rate_limits 
WHERE user_id = '52dc8c97-d467-4b6a-bb28-1872bea9436a' 
  AND endpoint = 'generate-workout';