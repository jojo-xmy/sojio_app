[
  {
    "trigger_name": "on_auth_user_created",
    "event_manipulation": "INSERT",
    "event_object_table": "users",
    "action_timing": "AFTER",
    "action_statement": "EXECUTE FUNCTION handle_new_user()",
    "trigger_schema": "auth"
  },
  {
    "trigger_name": "trigger_handle_calendar_task_delete",
    "event_manipulation": "DELETE",
    "event_object_table": "calendar_entries",
    "action_timing": "AFTER",
    "action_statement": "EXECUTE FUNCTION handle_calendar_task_delete()",
    "trigger_schema": "public"
  },
  {
    "trigger_name": "trigger_manage_calendar_task_association",
    "event_manipulation": "INSERT",
    "event_object_table": "calendar_entries",
    "action_timing": "BEFORE",
    "action_statement": "EXECUTE FUNCTION manage_calendar_task_association()",
    "trigger_schema": "public"
  },
  {
    "trigger_name": "trigger_manage_calendar_task_association",
    "event_manipulation": "UPDATE",
    "event_object_table": "calendar_entries",
    "action_timing": "BEFORE",
    "action_statement": "EXECUTE FUNCTION manage_calendar_task_association()",
    "trigger_schema": "public"
  },
  {
    "trigger_name": "update_calendar_entries_updated_at",
    "event_manipulation": "UPDATE",
    "event_object_table": "calendar_entries",
    "action_timing": "BEFORE",
    "action_statement": "EXECUTE FUNCTION update_updated_at_column()",
    "trigger_schema": "public"
  },
  {
    "trigger_name": "update_cleaner_availability_updated_at",
    "event_manipulation": "UPDATE",
    "event_object_table": "cleaner_availability",
    "action_timing": "BEFORE",
    "action_statement": "EXECUTE FUNCTION update_updated_at_column()",
    "trigger_schema": "public"
  },
  {
    "trigger_name": "update_hotels_updated_at",
    "event_manipulation": "UPDATE",
    "event_object_table": "hotels",
    "action_timing": "BEFORE",
    "action_statement": "EXECUTE FUNCTION update_updated_at_column()",
    "trigger_schema": "public"
  },
  {
    "trigger_name": "update_registration_applications_updated_at",
    "event_manipulation": "UPDATE",
    "event_object_table": "registration_applications",
    "action_timing": "BEFORE",
    "action_statement": "EXECUTE FUNCTION update_updated_at_column()",
    "trigger_schema": "public"
  },
  {
    "trigger_name": "update_tasks_updated_at",
    "event_manipulation": "UPDATE",
    "event_object_table": "tasks",
    "action_timing": "BEFORE",
    "action_statement": "EXECUTE FUNCTION update_updated_at_column()",
    "trigger_schema": "public"
  },
  {
    "trigger_name": "update_user_profiles_updated_at",
    "event_manipulation": "UPDATE",
    "event_object_table": "user_profiles",
    "action_timing": "BEFORE",
    "action_statement": "EXECUTE FUNCTION update_updated_at_column()",
    "trigger_schema": "public"
  },
  {
    "trigger_name": "tr_check_filters",
    "event_manipulation": "INSERT",
    "event_object_table": "subscription",
    "action_timing": "BEFORE",
    "action_statement": "EXECUTE FUNCTION realtime.subscription_check_filters()",
    "trigger_schema": "realtime"
  },
  {
    "trigger_name": "tr_check_filters",
    "event_manipulation": "UPDATE",
    "event_object_table": "subscription",
    "action_timing": "BEFORE",
    "action_statement": "EXECUTE FUNCTION realtime.subscription_check_filters()",
    "trigger_schema": "realtime"
  },
  {
    "trigger_name": "enforce_bucket_name_length_trigger",
    "event_manipulation": "INSERT",
    "event_object_table": "buckets",
    "action_timing": "BEFORE",
    "action_statement": "EXECUTE FUNCTION storage.enforce_bucket_name_length()",
    "trigger_schema": "storage"
  },
  {
    "trigger_name": "enforce_bucket_name_length_trigger",
    "event_manipulation": "UPDATE",
    "event_object_table": "buckets",
    "action_timing": "BEFORE",
    "action_statement": "EXECUTE FUNCTION storage.enforce_bucket_name_length()",
    "trigger_schema": "storage"
  },
  {
    "trigger_name": "objects_delete_delete_prefix",
    "event_manipulation": "DELETE",
    "event_object_table": "objects",
    "action_timing": "AFTER",
    "action_statement": "EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger()",
    "trigger_schema": "storage"
  },
  {
    "trigger_name": "objects_insert_create_prefix",
    "event_manipulation": "INSERT",
    "event_object_table": "objects",
    "action_timing": "BEFORE",
    "action_statement": "EXECUTE FUNCTION storage.objects_insert_prefix_trigger()",
    "trigger_schema": "storage"
  },
  {
    "trigger_name": "objects_update_create_prefix",
    "event_manipulation": "UPDATE",
    "event_object_table": "objects",
    "action_timing": "BEFORE",
    "action_statement": "EXECUTE FUNCTION storage.objects_update_prefix_trigger()",
    "trigger_schema": "storage"
  },
  {
    "trigger_name": "update_objects_updated_at",
    "event_manipulation": "UPDATE",
    "event_object_table": "objects",
    "action_timing": "BEFORE",
    "action_statement": "EXECUTE FUNCTION storage.update_updated_at_column()",
    "trigger_schema": "storage"
  },
  {
    "trigger_name": "prefixes_create_hierarchy",
    "event_manipulation": "INSERT",
    "event_object_table": "prefixes",
    "action_timing": "BEFORE",
    "action_statement": "EXECUTE FUNCTION storage.prefixes_insert_trigger()",
    "trigger_schema": "storage"
  },
  {
    "trigger_name": "prefixes_delete_hierarchy",
    "event_manipulation": "DELETE",
    "event_object_table": "prefixes",
    "action_timing": "AFTER",
    "action_statement": "EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger()",
    "trigger_schema": "storage"
  }
]