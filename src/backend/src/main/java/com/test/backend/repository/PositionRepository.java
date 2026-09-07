package com.test.backend.repository;

import com.test.backend.entity.position.Position;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PositionRepository extends JpaRepository<Position, Long> {
    List<Position> findAll();

    List<Position> findAllByPositionNameIn(List<String> positionNameList);

    List<Position> findAllByPositionNameInIgnoreCase(List<String> positionNames);

    Optional<Position> findByPositionNameIgnoreCase(String positionName);

    Boolean existsByPositionNameIgnoreCase(String positionName);
}
