<?php

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

require_once "db.php";

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit();
}

$method = $_SERVER["REQUEST_METHOD"];

/*
|--------------------------------------------------------------------------
| Get path
|--------------------------------------------------------------------------
*/

$requestUri = parse_url($_SERVER["REQUEST_URI"], PHP_URL_PATH);

$base = "/Shopping-List-Application/api";

$route = str_replace($base, "", $requestUri);

$route = rtrim($route, "/");

if ($route === "") {
    $route = "/";
}


/*
|--------------------------------------------------------------------------
| GET /api/stores
|--------------------------------------------------------------------------
*/

if ($method === "GET" && $route === "/stores") {

    $sql = "SELECT id, name, created_at
            FROM stores
            ORDER BY id ASC";

    $result = $conn->query($sql);

    if (!$result) {
        http_response_code(500);

        echo json_encode([
            "error" => $conn->error
        ]);

        exit();
    }

    $stores = [];

    while ($row = $result->fetch_assoc()) {

        $row["id"] = (int)$row["id"];

        $stores[] = $row;
    }

    echo json_encode($stores);

    exit();
}


/*
|--------------------------------------------------------------------------
| POST /api/stores
|--------------------------------------------------------------------------
*/

if ($method === "POST" && $route === "/stores") {

    $data = json_decode(
        file_get_contents("php://input"),
        true
    );

    $name = trim($data["name"] ?? "");

    if ($name === "") {

        http_response_code(400);

        echo json_encode([
            "error" => "Store name is required."
        ]);

        exit();
    }

    /*
    |----------------------------------------------------------------------
    | Check if store already exists
    |----------------------------------------------------------------------
    */

    $checkStmt = $conn->prepare(
        "SELECT id
         FROM stores
         WHERE name = ?"
    );

    $checkStmt->bind_param("s", $name);

    $checkStmt->execute();

    $checkResult = $checkStmt->get_result();

    if ($checkResult->num_rows > 0) {

        http_response_code(409);

        echo json_encode([
            "error" => "A store with this name already exists."
        ]);

        exit();
    }

    /*
    |----------------------------------------------------------------------
    | Add new store
    |----------------------------------------------------------------------
    */

    $stmt = $conn->prepare(
        "INSERT INTO stores (name)
         VALUES (?)"
    );

    $stmt->bind_param("s", $name);

    if ($stmt->execute()) {

        http_response_code(201);

        echo json_encode([
            "message" => "Store added successfully.",
            "id" => $stmt->insert_id
        ]);

    } else {

        http_response_code(500);

        echo json_encode([
            "error" => "Could not add store."
        ]);
    }

    exit();
}


/*
|--------------------------------------------------------------------------
| GET /api/stores/{id}/items
|--------------------------------------------------------------------------
*/

if (
    $method === "GET" &&
    preg_match(
        "#^/stores/([0-9]+)/items$#",
        $route,
        $matches
    )
) {

    $storeId = (int)$matches[1];

    $stmt = $conn->prepare(
        "SELECT id, store_id, name, quantity, checked, created_at
         FROM items
         WHERE store_id = ?
         ORDER BY id DESC"
    );

    $stmt->bind_param("i", $storeId);

    if (!$stmt->execute()) {

        http_response_code(500);

        echo json_encode([
            "error" => $stmt->error
        ]);

        exit();
    }

    $result = $stmt->get_result();

    $items = [];

    while ($row = $result->fetch_assoc()) {

        $row["id"] = (int)$row["id"];
        $row["store_id"] = (int)$row["store_id"];
        $row["quantity"] = (int)$row["quantity"];
        $row["checked"] = (int)$row["checked"];

        $items[] = $row;
    }

    echo json_encode($items);

    exit();
}


/*
|--------------------------------------------------------------------------
| POST /api/stores/{id}/items
|--------------------------------------------------------------------------
*/

if (
    $method === "POST" &&
    preg_match(
        "#^/stores/([0-9]+)/items$#",
        $route,
        $matches
    )
) {

    $storeId = (int)$matches[1];

    $data = json_decode(
        file_get_contents("php://input"),
        true
    );

    $name = trim($data["name"] ?? "");

    $quantity = isset($data["quantity"])
        ? (int)$data["quantity"]
        : 1;

    if ($name === "") {

        http_response_code(400);

        echo json_encode([
            "error" => "Item name is required."
        ]);

        exit();
    }

    if ($quantity < 1) {
        $quantity = 1;
    }

    /*
    |----------------------------------------------------------------------
    | Make sure the store exists
    |----------------------------------------------------------------------
    */

    $storeCheck = $conn->prepare(
        "SELECT id
         FROM stores
         WHERE id = ?"
    );

    $storeCheck->bind_param("i", $storeId);

    $storeCheck->execute();

    $storeResult = $storeCheck->get_result();

    if ($storeResult->num_rows === 0) {

        http_response_code(404);

        echo json_encode([
            "error" => "Store not found."
        ]);

        exit();
    }

    /*
    |----------------------------------------------------------------------
    | Add item
    |----------------------------------------------------------------------
    */

    $stmt = $conn->prepare(
        "INSERT INTO items
        (store_id, name, quantity, checked)
        VALUES (?, ?, ?, 0)"
    );

    $stmt->bind_param(
        "isi",
        $storeId,
        $name,
        $quantity
    );

    if ($stmt->execute()) {

        http_response_code(201);

        echo json_encode([
            "message" => "Item added successfully.",
            "id" => $stmt->insert_id
        ]);

    } else {

        http_response_code(500);

        echo json_encode([
            "error" => "Could not add item."
        ]);
    }

    exit();
}


/*
|--------------------------------------------------------------------------
| DELETE /api/stores/{id}
|--------------------------------------------------------------------------
*/

if (
    $method === "DELETE" &&
    preg_match(
        "#^/stores/([0-9]+)$#",
        $route,
        $matches
    )
) {

    $storeId = (int)$matches[1];

    $stmt = $conn->prepare(
        "DELETE FROM stores
         WHERE id = ?"
    );

    $stmt->bind_param("i", $storeId);

    if ($stmt->execute()) {

        if ($stmt->affected_rows === 0) {

            http_response_code(404);

            echo json_encode([
                "error" => "Store not found."
            ]);

        } else {

            echo json_encode([
                "message" => "Store deleted successfully."
            ]);
        }

    } else {

        http_response_code(500);

        echo json_encode([
            "error" => $stmt->error
        ]);
    }

    exit();
}


/*
|--------------------------------------------------------------------------
| PUT /api/items/{id}
|--------------------------------------------------------------------------
*/

if (
    $method === "PUT" &&
    preg_match(
        "#^/items/([0-9]+)$#",
        $route,
        $matches
    )
) {

    $itemId = (int)$matches[1];

    $data = json_decode(
        file_get_contents("php://input"),
        true
    );

    $name = trim($data["name"] ?? "");

    $quantity = isset($data["quantity"])
        ? (int)$data["quantity"]
        : 1;

    $checked = isset($data["checked"])
        ? (int)$data["checked"]
        : 0;

    if ($name === "") {

        http_response_code(400);

        echo json_encode([
            "error" => "Item name is required."
        ]);

        exit();
    }

    if ($quantity < 1) {
        $quantity = 1;
    }

    $checked = $checked ? 1 : 0;

    $stmt = $conn->prepare(
        "UPDATE items
         SET name = ?,
             quantity = ?,
             checked = ?
         WHERE id = ?"
    );

    $stmt->bind_param(
        "siii",
        $name,
        $quantity,
        $checked,
        $itemId
    );

    if ($stmt->execute()) {

        if ($stmt->affected_rows === 0) {

            http_response_code(404);

            echo json_encode([
                "error" => "Item not found or no changes were made."
            ]);

        } else {

            echo json_encode([
                "message" => "Item updated successfully."
            ]);
        }

    } else {

        http_response_code(500);

        echo json_encode([
            "error" => $stmt->error
        ]);
    }

    exit();
}


/*
|--------------------------------------------------------------------------
| DELETE /api/items/{id}
|--------------------------------------------------------------------------
*/

if (
    $method === "DELETE" &&
    preg_match(
        "#^/items/([0-9]+)$#",
        $route,
        $matches
    )
) {

    $itemId = (int)$matches[1];

    $stmt = $conn->prepare(
        "DELETE FROM items
         WHERE id = ?"
    );

    $stmt->bind_param("i", $itemId);

    if ($stmt->execute()) {

        if ($stmt->affected_rows === 0) {

            http_response_code(404);

            echo json_encode([
                "error" => "Item not found."
            ]);

        } else {

            echo json_encode([
                "message" => "Item deleted successfully."
            ]);
        }

    } else {

        http_response_code(500);

        echo json_encode([
            "error" => $stmt->error
        ]);
    }

    exit();
}


/*
|--------------------------------------------------------------------------
| Endpoint not found
|--------------------------------------------------------------------------
*/

http_response_code(404);

echo json_encode([
    "error" => "Endpoint not found.",
    "method" => $method,
    "route" => $route
]);

?>