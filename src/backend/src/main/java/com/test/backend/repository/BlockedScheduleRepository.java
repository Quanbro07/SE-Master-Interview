package com.test.backend.repository;

import com.test.backend.entity.blockedSchedule.BlockedSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Date;
import java.util.List;

public interface BlockedScheduleRepository extends JpaRepository<BlockedSchedule, Long> {

    @Query("SELECT b FROM BlockedSchedule b " +
            "WHERE b.interviewer.interviewerId = :interviewerId " +
            "AND b.startTime < :end " +     // Lưu ý: startTime nhỏ hơn tham số end
            "AND b.endTime > :start")       // Lưu ý: endTime lớn hơn tham số start
    List<BlockedSchedule> findOverlappingBlockedSchedules(
            @Param("interviewerId") Long interviewerId,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );
}
