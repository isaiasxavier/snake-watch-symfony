<?php

if (file_exists(dirname(__DIR__).'/var/cache/prod/App_KernelProdContainer.preload.php')) {
    require dirname(__DIR__).'/var/cache/prod/App_KernelProdContainer.preload.php';
}
    
    // Debugging statement to print the current directory
    echo "Current directory: " . dirname(__DIR__) . "\n";
    
    // Ensure the bundles.php file is correctly referenced
    if (file_exists(dirname(__DIR__).'/config/bundles.php')) {
        echo "bundles.php found in config directory.\n";
        require dirname(__DIR__).'/config/bundles.php';
    } else {
        throw new \RuntimeException('bundles.php file is missing.');
    }