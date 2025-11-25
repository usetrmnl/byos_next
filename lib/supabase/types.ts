// you can regenerate this file from https://supabase.com/dashboard/project/_/api?page=tables-intro

export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[];

export type Device = {
	id: number; // bigint (BIGSERIAL)
	name: string;
	mac_address: string;
	api_key: string;
	friendly_id: string;
	screen: string | null; // Screen identifier that maps to a screen component
	refresh_schedule: RefreshSchedule | null; // Stored as JSONB in DB
	timezone: string; // Defaults to 'UTC'
	last_update_time: string | null; // ISO timestamp (TIMESTAMPTZ)
	next_expected_update: string | null; // ISO timestamp (TIMESTAMPTZ)
	last_refresh_duration: number | null; // in seconds
	battery_voltage: number | null; // Stored as NUMERIC in DB
	firmware_version: string | null;
	rssi: number | null; // WiFi signal strength in dBm
	created_at: string | null; // ISO timestamp (TIMESTAMPTZ, nullable with default)
	updated_at: string | null; // ISO timestamp (TIMESTAMPTZ, nullable with default)
	playlist_id: string | null;
	use_playlist: boolean | null;
	current_playlist_index: number | null;
};

export type Playlist = {
	id: string;
	name: string;
	created_at: string;
	updated_at: string;
};

export type PlaylistItem = {
	id: string;
	playlist_id: string;
	screen_id: string;
	duration: number;
	start_time?: string;
	end_time?: string;
	days_of_week?: string[];
	order_index: number;
	created_at: string;
};

export type TimeRange = {
	start_time: string; // Format: "HH:MM" in 24-hour format
	end_time: string; // Format: "HH:MM" in 24-hour format
	refresh_rate: number; // Refresh rate in seconds
};

export type RefreshSchedule = {
	default_refresh_rate: number; // Default refresh rate in seconds
	time_ranges: TimeRange[]; // Array of time ranges with specific refresh rates
};

export type Log = {
	id: number; // bigint (BIGSERIAL)
	device_id: number;
	friendly_id?: string | null; // Now explicitly nullable
	log_data: string;
	created_at: string | null; // ISO timestamp (TIMESTAMPTZ, nullable with default)
};

export type SystemLog = {
	id: string; // UUID
	created_at: string | null; // TIMESTAMPTZ (nullable with default)
	level: string;
	message: string;
	source: string | null;
	metadata: string | null;
	trace: string | null;
};

export type Database = {
	graphql_public: {
		Tables: {
			[_ in never]: never;
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			graphql: {
				Args: {
					operationName?: string;
					query?: string;
					variables?: Json;
					extensions?: Json;
				};
				Returns: Json;
			};
		};
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
	public: {
		Tables: {
			devices: {
				Row: Device;
				Insert: Omit<
					Device,
					| "id"
					| "created_at"
					| "updated_at"
					| "last_update_time"
					| "next_expected_update"
					| "last_refresh_duration"
				>;
				Update: Partial<Omit<Device, "id">>;
				Relationships: [
					{
						foreignKeyName: "devices_playlist_id_fkey";
						columns: ["playlist_id"];
						isOneToOne: false;
						referencedRelation: "playlists";
						referencedColumns: ["id"];
					},
				];
			};
			logs: {
				Row: Log;
				Insert: Omit<Log, "id" | "created_at">;
				Update: Partial<Omit<Log, "id">>;
				Relationships: [
					{
						foreignKeyName: "logs_friendly_id_fkey";
						columns: ["friendly_id"];
						isOneToOne: false;
						referencedRelation: "devices";
						referencedColumns: ["friendly_id"];
					},
				];
			};
			system_logs: {
				Row: SystemLog;
				Insert: Omit<SystemLog, "id" | "created_at">;
				Update: Partial<Omit<SystemLog, "id">>;
				Relationships: [];
			};
			playlists: {
				Row: Playlist;
				Insert: Omit<Playlist, "id" | "created_at" | "updated_at">;
				Update: Partial<Omit<Playlist, "id">>;
				Relationships: [];
			};
			playlist_items: {
				Row: PlaylistItem;
				Insert: Omit<PlaylistItem, "id" | "created_at">;
				Update: Partial<Omit<PlaylistItem, "id">>;
				Relationships: [
					{
						foreignKeyName: "playlist_items_playlist_id_fkey";
						columns: ["playlist_id"];
						isOneToOne: false;
						referencedRelation: "playlists";
						referencedColumns: ["id"];
					},
				];
			};
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			[_ in never]: never;
		};
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
};

type PublicSchema = Database[Extract<keyof Database, "public">];

export type Tables<
	PublicTableNameOrOptions extends
		| keyof (PublicSchema["Tables"] & PublicSchema["Views"])
		| { schema: keyof Database },
	TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
		? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
				Database[PublicTableNameOrOptions["schema"]]["Views"])
		: never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
	? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
			Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
			Row: infer R;
		}
		? R
		: never
	: PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
				PublicSchema["Views"])
		? (PublicSchema["Tables"] &
				PublicSchema["Views"])[PublicTableNameOrOptions] extends {
				Row: infer R;
			}
			? R
			: never
		: never;

export type TablesInsert<
	PublicTableNameOrOptions extends
		| keyof PublicSchema["Tables"]
		| { schema: keyof Database },
	TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
		? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
		: never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
	? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
			Insert: infer I;
		}
		? I
		: never
	: PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
		? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
				Insert: infer I;
			}
			? I
			: never
		: never;

export type TablesUpdate<
	PublicTableNameOrOptions extends
		| keyof PublicSchema["Tables"]
		| { schema: keyof Database },
	TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
		? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
		: never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
	? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
			Update: infer U;
		}
		? U
		: never
	: PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
		? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
				Update: infer U;
			}
			? U
			: never
		: never;

export type Enums<
	PublicEnumNameOrOptions extends
		| keyof PublicSchema["Enums"]
		| { schema: keyof Database },
	EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
		? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
		: never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
	? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
	: PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
		? PublicSchema["Enums"][PublicEnumNameOrOptions]
		: never;

export type CompositeTypes<
	PublicCompositeTypeNameOrOptions extends
		| keyof PublicSchema["CompositeTypes"]
		| { schema: keyof Database },
	CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
		schema: keyof Database;
	}
		? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
		: never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
	? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
	: PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
		? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
		: never;
