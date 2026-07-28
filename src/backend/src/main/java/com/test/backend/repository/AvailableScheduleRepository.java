package com.test.backend.repository;

import com.test.backend.entity.availableSchedule.AvailableSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Set;

public interface AvailableScheduleRepository extends JpaRepository<AvailableSchedule, Long> {

    @Query("""
        SELECT a
        FROM AvailableSchedule a
        WHERE a.interviewer.interviewerId = :interviewerId
        AND a.dayOfWeek IN :daysOfWeek
        """)
    List<AvailableSchedule> findAllByInterviewerIdFilterDayOfWeek(
            @Param("interviewerId") Long interviewerId,
            @Param("daysOfWeek") Set<Short> dayList)
            ;

    @Modifying
    @Query("""
        DELETE FROM AvailableSchedule a
        WHERE a.interviewer.interviewerId = :interviewerId
        AND a.dayOfWeek IN :daysOfWeek
        """)
    void deleteByInterviewerIdAndDayOfWeekIn(
            @Param("interviewerId") Long interviewerId,
            @Param("daysOfWeek") Set<Short> daysOfWeek
    );

    List<AvailableSchedule> findAllByInterviewer_InterviewerId(Long interviewerId);
}
