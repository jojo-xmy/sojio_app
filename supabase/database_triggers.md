| create_trigger_sql                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CREATE TRIGGER trigger_generate_cleaning_tasks AFTER INSERT ON public.calendar_entries FOR EACH ROW EXECUTE FUNCTION generate_cleaning_tasks();
                        |
| CREATE TRIGGER update_calendar_entries_updated_at BEFORE UPDATE ON public.calendar_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
                   |
| CREATE TRIGGER update_cleaner_availability_updated_at BEFORE UPDATE ON public.cleaner_availability FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
           |
| CREATE TRIGGER update_hotels_updated_at BEFORE UPDATE ON public.hotels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
                                       |
| CREATE TRIGGER update_registration_applications_updated_at BEFORE UPDATE ON public.registration_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
 |
| CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
                                         |
| CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
                         |