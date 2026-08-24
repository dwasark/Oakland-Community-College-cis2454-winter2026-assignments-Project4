import React, { useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://localhost/Shopping-List-Application/api";

function App() {
    const [stores, setStores] = useState([]);
    const [items, setItems] = useState([]);
    const [selectedStore, setSelectedStore] = useState("");

    const [storeName, setStoreName] = useState("");
    const [itemName, setItemName] = useState("");
    const [quantity, setQuantity] = useState(1);

    const [editingId, setEditingId] = useState(null);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    // GET ALL STORES
    const getStores = async () => {
        try {
            const response = await fetch(`${API_URL}/stores`);

            if (!response.ok) {
                throw new Error("Could not load stores.");
            }

            const data = await response.json();

            setStores(data);

            if (data.length > 0 && selectedStore === "") {
                setSelectedStore(String(data[0].id));
            }

            if (data.length === 0) {
                setSelectedStore("");
                setItems([]);
            }
        } catch (error) {
            console.error("Error loading stores:", error);
            setMessage("Could not connect to the PHP API.");
        }
    };

    // GET ITEMS FOR SELECTED STORE
    const getItems = async (storeId) => {
        if (!storeId) {
            setItems([]);
            return;
        }

        try {
            setLoading(true);

            const response = await fetch(
                `${API_URL}/stores/${storeId}/items`
            );

            if (!response.ok) {
                throw new Error("Could not load items.");
            }

            const data = await response.json();

            setItems(data);
        } catch (error) {
            console.error("Error loading items:", error);
            setItems([]);
            setMessage("Could not load shopping items.");
        } finally {
            setLoading(false);
        }
    };

    // LOAD STORES WHEN APP OPENS
    useEffect(() => {
        getStores();
    }, []);

    // LOAD ITEMS WHEN STORE CHANGES
    useEffect(() => {
        if (selectedStore) {
            getItems(selectedStore);
        } else {
            setItems([]);
        }
    }, [selectedStore]);

    // ADD STORE
    const handleAddStore = async (event) => {
        event.preventDefault();

        const name = storeName.trim();

        if (name === "") {
            setMessage("Please enter a store name.");
            return;
        }

        try {
            const response = await fetch(`${API_URL}/stores`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name: name
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "Could not add store."
                );
            }

            setStoreName("");
            setMessage("Store added successfully.");

            await getStores();

            if (data.id) {
                setSelectedStore(String(data.id));
            }
        } catch (error) {
            console.error("Error adding store:", error);
            setMessage(error.message);
        }
    };

    // DELETE STORE
    const handleDeleteStore = async () => {
        if (!selectedStore) {
            setMessage("Please select a store first.");
            return;
        }

        const confirmed = window.confirm(
            "Are you sure you want to delete this store and all of its items?"
        );

        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch(
                `${API_URL}/stores/${selectedStore}`,
                {
                    method: "DELETE"
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "Could not delete store."
                );
            }

            setMessage("Store deleted successfully.");
            setSelectedStore("");
            setItems([]);

            await getStores();
        } catch (error) {
            console.error("Error deleting store:", error);
            setMessage(error.message);
        }
    };

    // ADD OR UPDATE ITEM
    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!selectedStore) {
            setMessage("Please select a store first.");
            return;
        }

        const name = itemName.trim();
        const itemQuantity = Number(quantity);

        if (name === "") {
            setMessage("Please enter an item name.");
            return;
        }

        if (!Number.isInteger(itemQuantity) || itemQuantity < 1) {
            setMessage("Quantity must be at least 1.");
            return;
        }

        try {
            let response;

            // UPDATE ITEM
            if (editingId !== null) {
                const currentItem = items.find(
                    (item) =>
                        Number(item.id) === Number(editingId)
                );

                response = await fetch(
                    `${API_URL}/items/${editingId}`,
                    {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            name: name,
                            quantity: itemQuantity,
                            checked: currentItem
                                ? Number(currentItem.checked)
                                : 0
                        })
                    }
                );
            }

            // ADD ITEM
            else {
                response = await fetch(
                    `${API_URL}/stores/${selectedStore}/items`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            name: name,
                            quantity: itemQuantity
                        })
                    }
                );
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "Could not save item."
                );
            }

            if (editingId !== null) {
                setMessage("Item updated successfully.");
            } else {
                setMessage("Item added successfully.");
            }

            setItemName("");
            setQuantity(1);
            setEditingId(null);

            await getItems(selectedStore);
        } catch (error) {
            console.error("Error saving item:", error);
            setMessage(error.message);
        }
    };

    // EDIT ITEM
    const handleEdit = (item) => {
        setEditingId(item.id);
        setItemName(item.name);
        setQuantity(Number(item.quantity));
        setMessage("");
    };

    // CANCEL EDIT
    const handleCancel = () => {
        setEditingId(null);
        setItemName("");
        setQuantity(1);
        setMessage("");
    };

    // CHECK / UNCHECK ITEM
    const handleToggle = async (item) => {
        try {
            const response = await fetch(
                `${API_URL}/items/${item.id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        name: item.name,
                        quantity: Number(item.quantity),
                        checked:
                            Number(item.checked) === 1 ? 0 : 1
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "Could not update item."
                );
            }

            await getItems(selectedStore);
        } catch (error) {
            console.error("Error updating item:", error);
            setMessage(error.message);
        }
    };

    // DELETE ITEM
    const handleDelete = async (id) => {
        const confirmed = window.confirm(
            "Are you sure you want to delete this item?"
        );

        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch(
                `${API_URL}/items/${id}`,
                {
                    method: "DELETE"
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "Could not delete item."
                );
            }

            setMessage("Item deleted successfully.");

            await getItems(selectedStore);
        } catch (error) {
            console.error("Error deleting item:", error);
            setMessage(error.message);
        }
    };

    return (
        <div className="container">

            <h1>Shopping List</h1>

            {/* STORE SECTION */}
            <section className="card">

                <h2>Stores</h2>

                <form
                    className="store-form"
                    onSubmit={handleAddStore}
                >
                    <input
                        type="text"
                        value={storeName}
                        onChange={(event) =>
                            setStoreName(event.target.value)
                        }
                        placeholder="Enter store name"
                    />

                    <button type="submit">
                        Add Store
                    </button>
                </form>

                <div className="store-controls">

                    <label htmlFor="store">
                        Select Store:
                    </label>

                    <select
                        id="store"
                        value={selectedStore}
                        onChange={(event) =>
                            setSelectedStore(event.target.value)
                        }
                    >
                        <option value="">
                            -- Select a Store --
                        </option>

                        {stores.map((store) => (
                            <option
                                key={store.id}
                                value={store.id}
                            >
                                {store.name}
                            </option>
                        ))}
                    </select>

                    <button
                        type="button"
                        className="danger-button"
                        onClick={handleDeleteStore}
                        disabled={!selectedStore}
                    >
                        Delete Store
                    </button>

                </div>

            </section>

            {/* MESSAGE */}
            {message && (
                <div className="message">
                    {message}
                </div>
            )}

            {/* ITEM SECTION */}
            <section className="card">

                <h2>
                    {editingId !== null
                        ? "Edit Shopping Item"
                        : "Add Shopping Item"}
                </h2>

                <form
                    className="item-form"
                    onSubmit={handleSubmit}
                >

                    <div className="form-group">

                        <label htmlFor="itemName">
                            Item:
                        </label>

                        <input
                            id="itemName"
                            type="text"
                            value={itemName}
                            onChange={(event) =>
                                setItemName(event.target.value)
                            }
                            placeholder="Enter item"
                        />

                    </div>

                    <div className="form-group">

                        <label htmlFor="quantity">
                            Quantity:
                        </label>

                        <input
                            id="quantity"
                            type="number"
                            min="1"
                            step="1"
                            value={quantity}
                            onChange={(event) =>
                                setQuantity(event.target.value)
                            }
                        />

                    </div>

                    <div className="form-buttons">

                        <button type="submit">
                            {editingId !== null
                                ? "Update Item"
                                : "Add Item"}
                        </button>

                        {editingId !== null && (
                            <button
                                type="button"
                                onClick={handleCancel}
                            >
                                Cancel
                            </button>
                        )}

                    </div>

                </form>

            </section>

            {/* SHOPPING ITEMS */}
            <section className="card">

                <h2>Shopping Items</h2>

                {!selectedStore ? (
                    <p className="empty-message">
                        Please select a store to see its shopping items.
                    </p>
                ) : loading ? (
                    <p className="empty-message">
                        Loading...
                    </p>
                ) : items.length === 0 ? (
                    <p className="empty-message">
                        No shopping items found for this store.
                    </p>
                ) : (
                    <div className="table-container">

                        <table>

                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Quantity</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>

                            <tbody>

                                {items.map((item) => (

                                    <tr key={item.id}>

                                        <td
                                            className={
                                                Number(item.checked) === 1
                                                    ? "completed"
                                                    : ""
                                            }
                                        >
                                            {item.name}
                                        </td>

                                        <td>
                                            {item.quantity}
                                        </td>

                                        <td>

                                            <button
                                                type="button"
                                                className={
                                                    Number(item.checked) === 1
                                                        ? "completed-button"
                                                        : "status-button"
                                                }
                                                onClick={() =>
                                                    handleToggle(item)
                                                }
                                            >
                                                {Number(item.checked) === 1
                                                    ? "Completed"
                                                    : "Not Completed"}
                                            </button>

                                        </td>

                                        <td className="actions">

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleEdit(item)
                                                }
                                            >
                                                Edit
                                            </button>

                                            <button
                                                type="button"
                                                className="danger-button"
                                                onClick={() =>
                                                    handleDelete(item.id)
                                                }
                                            >
                                                Delete
                                            </button>

                                        </td>

                                    </tr>

                                ))}

                            </tbody>

                        </table>

                    </div>
                )}

            </section>

        </div>
    );
}

export default App;