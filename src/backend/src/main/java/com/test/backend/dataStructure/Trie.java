package com.test.backend.dataStructure;

import java.util.*;

public class Trie {
    private final TrieNode root;

    public Trie() {
        root = new TrieNode();
    }

    // Add 1 từ vào Trie
    public void insert(String word) {
        if(word == null || word.trim().isEmpty()) {
            return;
        }

        String normalizedWord = word.toLowerCase();

        String[] words = normalizedWord.split("\\s+");

        for(String w: words) {
            TrieNode current = root;

            for(char ch : w.toCharArray()) {
                current.children.putIfAbsent(ch, new TrieNode());
                current = current.children.get(ch);
            }
            current.isEndOfWord = true;

            if (!current.originalStrings.contains(word)) {
                current.originalStrings.add(word);
            }
        }

    }

    public List<String> getWordsWithPrefix(String prefix, int limit) {
        List<String> results = new ArrayList<>();
        if (prefix == null || prefix.trim().isEmpty()) return results;

        TrieNode current = root;
        String normalizedPrefix = prefix.toLowerCase();

        // 1. Đi dọc theo cây để tìm đến Node cuối cùng của prefix
        for (char ch : normalizedPrefix.toCharArray()) {
            current = current.children.get(ch);
            if (current == null) {
                return results; // Không có từ nào bắt đầu bằng prefix này
            }
        }

        // 2. Dùng thuật toán duyệt sâu (DFS) để gom các chữ cái tiếp theo
        Set<String> uniqueResults = new LinkedHashSet<>();

        // 2. Dùng thuật toán DFS để gom các chuỗi gốc đã lưu
        dfs(current, uniqueResults, limit);

        // Chuyển từ Set về List trả cho người dùng
        return new ArrayList<>(uniqueResults);
    }

    private void dfs(TrieNode node, Set<String> results, int limit) {
        if (results.size() >= limit) {
            return; // Đủ số lượng thì dừng
        }

        // Nếu đây là điểm kết thúc của 1 từ, lấy các chuỗi gốc lưu vào results
        if (node.isEndOfWord) {
            for (String originalStr : node.originalStrings) {
                results.add(originalStr);
                if (results.size() >= limit) return; // Dừng sớm ngay khi đủ limit
            }
        }

        // Duyệt tiếp xuống các nhánh con
        for (TrieNode childNode : node.children.values()) {
            dfs(childNode, results, limit);
        }
    }
}
