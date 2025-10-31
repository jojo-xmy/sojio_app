[
  {
    "column_name": "cleaning_date",
    "data_type": "date",
    "column_default": null
  },
  {
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "column_default": "now()"
  },
  {
    "column_name": "created_by",
    "data_type": "uuid",
    "column_default": null
  },
  {
    "column_name": "assigned_cleaners",
    "data_type": "jsonb",
    "column_default": "'[]'::jsonb"
  },
  {
    "column_name": "accepted_by",
    "data_type": "ARRAY",
    "column_default": null
  },
  {
    "column_name": "completed_at",
    "data_type": "timestamp without time zone",
    "column_default": null
  },
  {
    "column_name": "confirmed_at",
    "data_type": "timestamp without time zone",
    "column_default": null
  },
  {
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "column_default": "now()"
  },
  {
    "column_name": "hotel_id",
    "data_type": "uuid",
    "column_default": null
  },
  {
    "column_name": "check_out_date",
    "data_type": "date",
    "column_default": null
  },
  {
    "column_name": "id",
    "data_type": "uuid",
    "column_default": "uuid_generate_v4()"
  },
  {
    "column_name": "check_in_date",
    "data_type": "date",
    "column_default": null
  },
  {
    "column_name": "hotel_name",
    "data_type": "text",
    "column_default": null
  },
  {
    "column_name": "note",
    "data_type": "text",
    "column_default": null
  },
  {
    "column_name": "check_in_time",
    "data_type": "text",
    "column_default": null
  },
  {
    "column_name": "description",
    "data_type": "text",
    "column_default": null
  },
  {
    "column_name": "status",
    "data_type": "text",
    "column_default": "'draft'::text"
  },
  {
    "column_name": "attendance_status",
    "data_type": "text",
    "column_default": null
  },
  {
    "column_name": "hotel_address",
    "data_type": "text",
    "column_default": null
  },
  {
    "column_name": "lock_password",
    "data_type": "text",
    "column_default": null
  },
  {
    "column_name": "special_instructions",
    "data_type": "text",
    "column_default": null
  }
]