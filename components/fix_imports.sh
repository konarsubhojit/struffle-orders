#!/bin/bash

# Function to fix a component file
fix_component() {
    local file="$1"
    
    # Check if file exists
    if [ ! -f "$file" ]; then
        return
    fi
    
    # Create temp file
    local temp_file="${file}.tmp"
    
    # Add 'use client' if not present and has hooks/state
    if head -1 "$file" | grep -q "^import"; then
        echo "'use client';" > "$temp_file"
        echo "" >> "$temp_file"
        cat "$file" >> "$temp_file"
    else
        cp "$file" "$temp_file"
    fi
    
    # Fix import paths
    sed -i "s|from '../services/api'|from '@/lib/api/client'|g" "$temp_file"
    sed -i "s|from '../contexts/|from '@/contexts/|g" "$temp_file"
    sed -i "s|from '../types'|from '@/types'|g" "$temp_file"
    sed -i "s|from '../constants/|from '@/constants/|g" "$temp_file"
    sed -i "s|from '../utils/|from '@/lib/utils/|g" "$temp_file"
    sed -i "s|from '../hooks/|from '@/hooks/|g" "$temp_file"
    
    # Move temp to original
    mv "$temp_file" "$file"
}

# Fix all component files
for dir in orders items analytics; do
    if [ -d "$dir" ]; then
        for file in $dir/*.tsx; do
            if [ -f "$file" ]; then
                echo "Fixing $file"
                fix_component "$file"
            fi
        done
    fi
done

echo "Done!"
