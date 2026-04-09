package com.moodmirror.moodmirror_backend.repository;

import com.moodmirror.moodmirror_backend.entity.MoodPattern;
import com.moodmirror.moodmirror_backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MoodPatternRepository extends JpaRepository<MoodPattern, Long> {
    List<MoodPattern> findByUserAndIsActiveTrueOrderByConfidenceDesc(User user);
    List<MoodPattern> findByUser(User user);
}