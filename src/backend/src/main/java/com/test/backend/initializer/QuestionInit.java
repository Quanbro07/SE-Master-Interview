package com.test.backend.initializer;

import com.test.backend.entity.category.Category;
import com.test.backend.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@RequiredArgsConstructor
@Component
@Order(2)
public class QuestionInit {

    private final CategoryRepository categoryRepository;

    private final String[] categoryList = {
            "Backend Web Development",
            "Java Frameworks",
            "Artificial Intelligence",
            "Search Algorithm"
    };

    @Value("${init.isDev}")
    private boolean isDev;

    @Bean
    CommandLineRunner initCategory() {
        return args -> {
            if(!isDev) {
                return;
            }

            List<Category> categories = new ArrayList<>();

            // Init Category
            for(String category: categoryList) {
                Category c = Category.builder()
                        .categoryName(category)
                        .build();

                categories.add(c);
            }


        };

    }
}
