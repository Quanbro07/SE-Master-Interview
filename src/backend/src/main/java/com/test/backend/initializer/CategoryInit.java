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
public class CategoryInit {

    private final CategoryRepository categoryRepository;



    @Value("${init.isDev}")
    private boolean isDev;


    @Order(1)
    @Bean
    CommandLineRunner initCategory() {
        return args -> {
            if (!isDev || categoryRepository.count() > 0) {
                System.out.println("Positions already exist or not in Dev mode. Skipping Question/Category init.");
                return;
            }

            String[] categoryList = {
                    "Backend Web Development",
                    "Java Frameworks",
                    "Artificial Intelligence",
                    "Search Algorithm"
            };


            List<Category> categories = new ArrayList<>();

            // Init Category
            for(String category: categoryList) {
                Category c = Category.builder()
                        .categoryName(category)
                        .build();

                categories.add(c);
            }
            categoryRepository.saveAll(categories);

        };

    }
}
