// //components/RotaTable.js

'use client';
import { useState } from 'react';

export default function RotaTable({ data, onUpdate }) {
  const [editingRow, setEditingRow] = useState(null);
  const [updatedData, setUpdatedData] = useState({});

  // Set editing mode
  const handleEditClick = (rowIndex) => {
    setEditingRow(rowIndex);
    setUpdatedData(data[rowIndex]); // Set initial row data for editing
  };

  // Handle input changes in the table
  const handleInputChange = (e, field) => {
    setUpdatedData((prevData) => ({
      ...prevData,
      [field]: e.target.value,
    }));
  };

  // Save the edited data and send it back to the parent
  const handleSaveClick = () => {
    if (onUpdate) {
      const updatedRota = [...data]; // Clone the current data
      updatedRota[editingRow] = updatedData; // Apply the edits to the correct row
      onUpdate(updatedRota); // Send updated rota back to parent
    }
    setEditingRow(null); // Exit editing mode
  };

  return (
    <div>
      <table className='min-w-full divide-y divide-gray-200'>
        <thead>
          <tr>
            <th>Staff</th>
            <th>Post</th>
            <th>Description</th>
            <th>Monday</th>
            <th>Tuesday</th>
            <th>Wednesday</th>
            <th>Thursday</th>
            <th>Friday</th>
            <th>Saturday</th>
            <th>Sunday</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody className='bg-white divide-y divide-gray-200'>
          {data.map((row, index) => (
            <tr key={index}>
              {Object.keys(row).map((key) => (
                <td key={key} className='px-6 py-4'>
                  {editingRow === index ? (
                    <input
                      type='text'
                      value={updatedData[key] || ''} // Show the current editing data
                      onChange={(e) => handleInputChange(e, key)}
                      className='w-full px-3 py-1 border border-gray-300 rounded-md'
                    />
                  ) : (
                    row[key] || 'N/A' // Display original data when not editing
                  )}
                </td>
              ))}
              <td>
                {editingRow === index ? (
                  <button
                    onClick={handleSaveClick}
                    className='bg-blue-500 text-white px-3 py-1 rounded-md'
                  >
                    Save
                  </button>
                ) : (
                  <button
                    onClick={() => handleEditClick(index)}
                    className='bg-yellow-500 text-white px-3 py-1 rounded-md'
                  >
                    Edit
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
