UPDATE Devs set heat_time = datetime(
            julianday("2021-01-17 14:00:00")
            -
            (
                    julianday((SELECT start_time FROM Temps where dev_id = 1 AND inside_temp = 15 limit 1))
                    -
                    julianday((SELECT end_time FROM Temps where dev_id = 1 AND inside_temp = 5 AND end_time < (
                        SELECT start_time FROM Temps where dev_id = 1 AND inside_temp = 15 limit 1
                        ) limit 1))
                )
    ) where id = 1;
